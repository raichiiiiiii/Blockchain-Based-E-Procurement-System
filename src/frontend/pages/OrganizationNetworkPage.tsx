import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  acceptOrganizationNetworkRequest,
  createOrganizationNetworkRequest,
  getOrganizationGraphTrail,
  getOrganizationNetworkGraph,
  getOwnOrganizationProfile,
  listEmailNotificationOutbox,
  listOrganizationNetworkRequests,
  rejectOrganizationNetworkRequest,
  searchOrganizationByIdentifier,
} from '../api/organization-network';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  EmailNotificationRecord,
  OrganizationGraphEdge,
  OrganizationGraphNode,
  OrganizationGraphProjection,
  OrganizationGraphTrailEntry,
  OrganizationNetworkRequest,
  OrganizationProfile,
  OrganizationRelationshipIntent,
} from '../types/organization-network';

type OrganizationNetworkPageProps = {
  session: AuthenticatedFrontendSession;
  onOpenCompanyLedger?: () => void;
};

type NetworkFormState = {
  identifier: string;
  relationshipType: OrganizationRelationshipIntent;
  purpose: string;
  message: string;
};

const defaultNetworkForm: NetworkFormState = {
  identifier: 'barakah-supplies',
  relationshipType: 'buyer',
  purpose: 'Prepare controlled procurement collaboration.',
  message: 'Request organization network setup.',
};

function statusTone(status?: string): StatusTone {
  switch (status) {
    case 'active':
    case 'eligible':
    case 'anchored':
    case 'verified':
    case 'accepted':
    case 'queued':
      return 'success';
    case 'pendingReview':
    case 'sent':
    case 'received':
    case 'pending':
    case 'unknown':
      return 'pending';
    case 'flagged':
    case 'localProofOnly':
      return 'warning';
    case 'blocked':
    case 'suspended':
    case 'deleted':
    case 'failed':
    case 'mismatch':
    case 'rejected':
      return 'danger';
    case 'unavailable':
      return 'info';
    default:
      return 'neutral';
  }
}

function formatLabel(value?: string): string {
  if (!value) {
    return 'Not recorded';
  }

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

function formatDate(value?: string): string {
  if (!value) {
    return 'Not recorded';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function positionNodes(nodes: OrganizationGraphNode[]) {
  const center = { x: 360, y: 250 };
  const radius = 170;
  const nonSelf = nodes.filter(node => node.relationshipToCurrentOrg !== 'self');
  const positioned = new Map<string, { x: number; y: number }>();
  const self = nodes.find(node => node.relationshipToCurrentOrg === 'self') ?? nodes[0];

  if (self) {
    positioned.set(self.organizationId, center);
  }

  nonSelf.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nonSelf.length, 1) - Math.PI / 2;
    positioned.set(node.organizationId, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return positioned;
}

function nodeHoverSummary(node: OrganizationGraphNode): string {
  return [
    `${node.displayName} (${node.uniqueIdentifier})`,
    `Node type: ${formatLabel(node.nodeType)}`,
    `Relationship: ${formatLabel(node.relationshipToCurrentOrg)} as ${formatLabel(node.relationshipRole)}`,
    `Deals: ${node.activeDealCount}`,
    `Eligibility: ${formatLabel(node.eligibilityStatus)}`,
    `Last interaction: ${formatDate(node.lastInteractionAt)}`,
    node.profileSummary ?? 'No public profile summary recorded.',
    node.proofChannelSummary ?? 'No proof-channel summary recorded.',
  ].join(' | ');
}

function edgeHoverSummary(edge: OrganizationGraphEdge): string {
  return [
    `${formatLabel(edge.relationshipType)} relationship`,
    `Vector type: ${formatLabel(edge.edgeType)}`,
    `Direction: ${formatLabel(edge.direction)}`,
    `Stage: ${formatLabel(edge.currentStage)}`,
    `Scope: ${formatLabel(edge.channelScope)}`,
    `Anchor: ${formatLabel(edge.anchorStatus)}`,
    `Verification: ${formatLabel(edge.verificationStatus)}`,
    edge.latestPayloadHash ? `Latest hash: ${edge.latestPayloadHash}` : 'No payload hash recorded',
    edge.claimBoundary ?? 'Relationship proof metadata only.',
    edge.safeSummary,
  ].join(' | ');
}

function isClaimBoundaryNode(node: OrganizationGraphNode): boolean {
  return ['fabricProofBoundary', 'apiIntegrationClient', 'erpAccountingAdapter', 'logisticsProofProvider'].includes(node.nodeType ?? '');
}

function GraphCanvas({
  graph,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onHoverSummary,
  onClearHover,
}: {
  graph: OrganizationGraphProjection;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  onSelectNode: (node: OrganizationGraphNode) => void;
  onSelectEdge: (edge: OrganizationGraphEdge) => void;
  onHoverSummary: (summary: string) => void;
  onClearHover: () => void;
}) {
  const positions = useMemo(() => positionNodes(graph.nodes), [graph.nodes]);

  return (
    <svg className="organization-graph-canvas" viewBox="0 0 720 500" role="img" aria-label="Organization network graph">
      <defs>
        <marker id="network-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" className="organization-graph-arrow" />
        </marker>
      </defs>
      {graph.edges.map(edge => {
        const source = positions.get(edge.sourceOrganizationId);
        const target = positions.get(edge.targetOrganizationId);
        if (!source || !target) {
          return null;
        }

        return (
          <g key={edge.id}>
            <line
              className={`organization-graph-edge organization-graph-edge-${edge.channelScope} ${selectedEdgeId === edge.id ? 'organization-graph-edge-selected' : ''}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              markerEnd="url(#network-arrow)"
              onClick={() => onSelectEdge(edge)}
              onMouseEnter={() => onHoverSummary(edgeHoverSummary(edge))}
              onMouseLeave={onClearHover}
            />
            <text
              className="organization-graph-edge-label"
              x={(source.x + target.x) / 2}
              y={(source.y + target.y) / 2 - 8}
              onClick={() => onSelectEdge(edge)}
              onMouseEnter={() => onHoverSummary(edgeHoverSummary(edge))}
              onMouseLeave={onClearHover}
            >
              <title>{edgeHoverSummary(edge)}</title>
              {formatLabel(edge.channelScope)}
            </text>
          </g>
        );
      })}
      {graph.nodes.map(node => {
        const position = positions.get(node.organizationId);
        if (!position) {
          return null;
        }

        const isSelf = node.relationshipToCurrentOrg === 'self';
        return (
          <g
            className={`organization-graph-node ${isSelf ? 'organization-graph-node-self' : ''} ${selectedNodeId === node.id ? 'organization-graph-node-selected' : ''}`}
            key={node.id}
            onClick={() => onSelectNode(node)}
            onMouseEnter={() => onHoverSummary(nodeHoverSummary(node))}
            onMouseLeave={onClearHover}
          >
            <title>{nodeHoverSummary(node)}</title>
            <circle cx={position.x} cy={position.y} r={isSelf ? 48 : 38} />
            <text x={position.x} y={position.y - 4}>{node.alias ?? node.displayName}</text>
            <text className="organization-graph-node-subtitle" x={position.x} y={position.y + 15}>
              {node.uniqueIdentifier}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function OrganizationNetworkPage({ session, onOpenCompanyLedger }: OrganizationNetworkPageProps) {
  const [profile, setProfile] = useState<OrganizationProfile | undefined>();
  const [graph, setGraph] = useState<OrganizationGraphProjection | undefined>();
  const [requests, setRequests] = useState<OrganizationNetworkRequest[]>([]);
  const [outbox, setOutbox] = useState<EmailNotificationRecord[]>([]);
  const [selectedNode, setSelectedNode] = useState<OrganizationGraphNode | undefined>();
  const [selectedEdge, setSelectedEdge] = useState<OrganizationGraphEdge | undefined>();
  const [trail, setTrail] = useState<OrganizationGraphTrailEntry[]>([]);
  const [searchResult, setSearchResult] = useState<OrganizationProfile | undefined>();
  const [form, setForm] = useState<NetworkFormState>(defaultNetworkForm);
  const [hoverSummary, setHoverSummary] = useState<string | undefined>();
  const [isTrailPanelOpen, setIsTrailPanelOpen] = useState(true);
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const inboundRequests = requests.filter(request =>
    request.targetOrganizationId === profile?.organizationId && request.state === 'sent'
  );

  const loadWorkspace = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [nextProfile, nextGraph, nextRequests, nextOutbox] = await Promise.all([
        getOwnOrganizationProfile(session),
        getOrganizationNetworkGraph(session),
        listOrganizationNetworkRequests(session),
        listEmailNotificationOutbox(session),
      ]);
      setProfile(nextProfile);
      setGraph(nextGraph);
      setRequests(nextRequests);
      setOutbox(nextOutbox);
      setSelectedNode(current => current ?? nextGraph.nodes.find(node => node.relationshipToCurrentOrg === 'self') ?? nextGraph.nodes[0]);
      setSelectedEdge(current => current ?? nextGraph.edges[0]);
      if (nextGraph.edges[0]) {
        setTrail(await getOrganizationGraphTrail(nextGraph.edges[0].id, session));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Organization network is unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [session.sessionId]);

  const handleSearch = async () => {
    setError(undefined);
    setMessage(undefined);
    setSearchResult(undefined);

    try {
      const result = await searchOrganizationByIdentifier(form.identifier, session);
      setSearchResult(result);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Organization could not be found');
    }
  };

  const handleCreateRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);
    setMessage(undefined);

    try {
      await createOrganizationNetworkRequest({
        targetUniqueIdentifier: form.identifier,
        relationshipType: form.relationshipType,
        purpose: form.purpose,
        message: form.message,
      }, session);
      setMessage('Network request sent.');
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Network request could not be sent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecision = async (requestId: string, decision: 'accept' | 'reject') => {
    setIsSubmitting(true);
    setError(undefined);
    setMessage(undefined);

    try {
      if (decision === 'accept') {
        await acceptOrganizationNetworkRequest(requestId, session);
        setMessage('Network request accepted.');
      } else {
        await rejectOrganizationNetworkRequest(requestId, session);
        setMessage('Network request rejected.');
      }
      await loadWorkspace();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Network request could not be updated');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectEdge = async (edge: OrganizationGraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(undefined);
    setError(undefined);

    try {
      setTrail(await getOrganizationGraphTrail(edge.id, session));
    } catch (trailError) {
      setTrail([]);
      setError(trailError instanceof Error ? trailError.message : 'Proof trail could not be loaded');
    }
  };

  const handleSelectNode = (node: OrganizationGraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(undefined);
    setTrail(isClaimBoundaryNode(node) ? [] : graph?.latestProofActivity ?? []);
  };

  const handleClearSelection = () => {
    setSelectedNode(undefined);
    setSelectedEdge(undefined);
    setTrail(graph?.latestProofActivity ?? []);
    setHoverSummary(undefined);
  };

  if (isLoading) {
    return (
      <section className="workspace-panel">
        <h2>Organization Network</h2>
        <p>Loading relationship graph, profile, and proof trail metadata.</p>
      </section>
    );
  }

  return (
    <div className="organization-network-page">
      <section className="proof-surface-header" aria-label="Organization Network">
        <p className="dashboard-role-label">Organization Network</p>
        <h2>Relationship graph and proof trail</h2>
        <p>Search trusted organizations, request network establishment, and inspect proof-aware relationship vectors.</p>
        <div className="network-panel-toggle-row" aria-label="Network panel controls">
          <button className="button button-secondary" type="button" onClick={() => setIsTrailPanelOpen(current => !current)}>
            {isTrailPanelOpen ? 'Hide trail' : 'Show trail'}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setIsActionPanelOpen(current => !current)}>
            {isActionPanelOpen ? 'Hide actions' : 'Show actions'}
          </button>
          <button className="button button-secondary" type="button" onClick={handleClearSelection}>
            Clear selection
          </button>
        </div>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert-success" role="status">{message}</div> : null}

      <div className={`organization-network-shell ${!isTrailPanelOpen ? 'organization-network-shell-no-left' : ''} ${!isActionPanelOpen ? 'organization-network-shell-no-right' : ''}`}>
        {isTrailPanelOpen ? (
        <aside className="organization-network-panel organization-network-panel-left" aria-label="Blockchain trail">
          <h3>Blockchain Trail</h3>
          {selectedEdge ? (
            <div className="network-selection-summary">
              <strong>{formatLabel(selectedEdge.edgeType ?? selectedEdge.relationshipType)}</strong>
              <span>{selectedEdge.safeSummary}</span>
              {selectedEdge.claimBoundary ? <span>{selectedEdge.claimBoundary}</span> : null}
              <StatusIndicator label={formatLabel(selectedEdge.channelScope)} tone={statusTone(selectedEdge.channelScope)} compact />
            </div>
          ) : selectedNode ? (
            <div className="network-selection-summary">
              <strong>{selectedNode.displayName}</strong>
              <span>{formatLabel(selectedNode.nodeType)}</span>
              <span>{selectedNode.profileSummary ?? 'No public profile summary recorded.'}</span>
              {isClaimBoundaryNode(selectedNode) ? (
                <span>This boundary is informational only; it does not create a route, external integration, or production certification.</span>
              ) : null}
              {selectedNode.proofChannelSummary ? <span>{selectedNode.proofChannelSummary}</span> : null}
              <StatusIndicator label={formatLabel(selectedNode.eligibilityStatus)} tone={statusTone(selectedNode.eligibilityStatus)} compact />
            </div>
          ) : (
            <div className="empty-product-state">Select a node or vector to inspect proof metadata.</div>
          )}

          <div className="network-trail-list">
            {trail.length === 0 ? (
              <div className="empty-product-state">No proof trail is available for this selection.</div>
            ) : trail.map(entry => (
              <article className="network-trail-row" key={entry.lifecycleEventId}>
                <div>
                  <strong>{formatLabel(entry.eventType)}</strong>
                  <span>{formatDate(entry.timestamp)}</span>
                </div>
                <StatusIndicator label={formatLabel(entry.verificationStatus)} tone={statusTone(entry.verificationStatus)} compact />
                <code>{entry.payloadHash}</code>
              </article>
            ))}
          </div>
        </aside>
        ) : null}

        <section className="organization-network-graph workspace-panel" aria-label="Relationship graph">
          {graph ? (
            <GraphCanvas
              graph={graph}
              selectedNodeId={selectedNode?.id}
              selectedEdgeId={selectedEdge?.id}
              onSelectNode={handleSelectNode}
              onSelectEdge={edge => void handleSelectEdge(edge)}
              onHoverSummary={setHoverSummary}
              onClearHover={() => setHoverSummary(undefined)}
            />
          ) : (
            <div className="empty-product-state">Graph data is not available.</div>
          )}
          <div className="network-hover-summary" aria-live="polite">
            {hoverSummary ?? 'Hover a node or vector to inspect company profile, relationship, stage, proof hash, and scope summary.'}
          </div>
        </section>

        {isActionPanelOpen ? (
        <aside className="organization-network-panel organization-network-panel-right" aria-label="Network actions">
          <h3>Establish Network</h3>
          <form className="admin-form" onSubmit={event => void handleCreateRequest(event)}>
            <label>
              Unique identifier
              <input
                value={form.identifier}
                onChange={event => setForm(current => ({ ...current, identifier: event.target.value }))}
              />
            </label>
            <label>
              Relationship
              <select
                value={form.relationshipType}
                onChange={event => setForm(current => ({
                  ...current,
                  relationshipType: event.target.value as OrganizationRelationshipIntent,
                }))}
              >
                <option value="buyer">Buyer relationship</option>
                <option value="supplier">Supplier relationship</option>
                <option value="financier">Financing relationship</option>
                <option value="logistics">Logistics relationship</option>
                <option value="auditorRegulator">Audit or reporting relationship</option>
                <option value="mixed">Mixed relationship</option>
              </select>
            </label>
            <label>
              Purpose
              <input
                value={form.purpose}
                onChange={event => setForm(current => ({ ...current, purpose: event.target.value }))}
              />
            </label>
            <label>
              Message
              <textarea
                value={form.message}
                onChange={event => setForm(current => ({ ...current, message: event.target.value }))}
              />
            </label>
            <div className="network-action-row">
              <button className="button button-secondary" type="button" onClick={() => void handleSearch()}>
                Preview
              </button>
              <button className="button button-primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? 'Sending' : 'Request network'}
              </button>
            </div>
          </form>

          {searchResult ? (
            <article className="network-preview-card">
              <strong>{searchResult.displayName ?? searchResult.legalName}</strong>
              <span>{searchResult.uniqueIdentifier}</span>
              <p>{searchResult.publicProfileSummary ?? 'No public profile summary recorded.'}</p>
              <StatusIndicator label={formatLabel(searchResult.eligibilityStatus)} tone={statusTone(searchResult.eligibilityStatus)} compact />
            </article>
          ) : null}

          <article className="network-preview-card">
            <strong>Start trade</strong>
            <span>Accepted relationships can move into Orders or Company Ledger.</span>
            <p>This action prepares the next workflow step only; it does not bypass eligibility, create escrow, or execute payment.</p>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                if (onOpenCompanyLedger) {
                  onOpenCompanyLedger();
                  return;
                }

                setMessage('Open Orders to create a governed order for an accepted relationship.');
              }}
            >
              Open company ledger
            </button>
          </article>

          <h3>Requests</h3>
          <div className="network-request-list">
            {inboundRequests.length === 0 ? (
              <div className="empty-product-state">No inbound requests require action.</div>
            ) : inboundRequests.map(request => (
              <article className="network-request-card" key={request.requestId}>
                <strong>{request.targetUniqueIdentifier}</strong>
                <span>{formatLabel(request.relationshipType)} request</span>
                <div className="network-action-row">
                  <button className="button button-secondary" disabled={isSubmitting} type="button" onClick={() => void handleDecision(request.requestId, 'reject')}>
                    Reject
                  </button>
                  <button className="button button-primary" disabled={isSubmitting} type="button" onClick={() => void handleDecision(request.requestId, 'accept')}>
                    Accept
                  </button>
                </div>
              </article>
            ))}
          </div>

          <h3>Email Outbox</h3>
          <div className="network-request-list">
            {outbox.length === 0 ? (
              <div className="empty-product-state">No notification records are available.</div>
            ) : outbox.slice(0, 4).map(notification => (
              <article className="network-request-card" key={notification.notificationId}>
                <strong>{notification.subject}</strong>
                <span>{notification.safeBody}</span>
                <StatusIndicator label={formatLabel(notification.status)} tone={statusTone(notification.status)} compact />
              </article>
            ))}
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  );
}

export default OrganizationNetworkPage;
