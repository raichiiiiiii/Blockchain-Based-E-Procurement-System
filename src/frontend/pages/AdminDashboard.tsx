import { FormEvent, useEffect, useMemo, useState } from 'react';
import { normalizeApiError, type BackendApiError } from '../api/errors';
import { listAccessHistory, type AccessHistoryEvent } from '../api/access-history';
import {
  listMemberOrganizations,
  updateMemberOrganizationStatus,
} from '../api/member-organizations';
import { listRoles } from '../api/roles';
import {
  changeRoleAssignment,
  createRoleAssignment,
  removeRoleAssignment,
} from '../api/role-assignments';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { MemberOrganizationResponse, MemberOrganizationStatus } from '../types/member-organization';
import type { RoleResponse } from '../types/role';

type AdminDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type LoadState = 'loading' | 'ready' | 'error';
type AssignmentMode = 'assign' | 'change' | 'revoke';

type AssignmentFormState = {
  mode: AssignmentMode;
  userId: string;
  organizationId: string;
  roleId: string;
  newRoleId: string;
};

const localMemberOrganizations: MemberOrganizationResponse[] = [
  {
    id: 'org_crescent_components',
    registrationNumber: 'MY-SME-8821',
    legalName: 'Crescent Components Sdn. Bhd.',
    displayName: 'Crescent Components',
    organizationType: 'Supplier',
    businessType: 'SME manufacturing',
    status: 'pendingReview',
    createdAt: '2026-05-20T03:15:00.000Z',
    updatedAt: '2026-05-20T03:15:00.000Z',
  },
  {
    id: 'org_nusantara_procurement',
    registrationNumber: 'MY-BUYER-1024',
    legalName: 'Nusantara Procurement Berhad',
    displayName: 'Nusantara Procurement',
    organizationType: 'Buyer',
    businessType: 'Public procurement office',
    status: 'active',
    createdAt: '2026-05-17T06:30:00.000Z',
    updatedAt: '2026-05-22T09:00:00.000Z',
  },
  {
    id: 'org_amanah_supply',
    registrationNumber: 'MY-SME-4419',
    legalName: 'Amanah Supply Cooperative',
    displayName: 'Amanah Supply',
    organizationType: 'Supplier',
    businessType: 'Distribution',
    status: 'suspended',
    createdAt: '2026-05-10T08:45:00.000Z',
    updatedAt: '2026-05-23T13:20:00.000Z',
  },
];

const localRoles: RoleResponse[] = [
  {
    id: 'role_administrator',
    roleCode: 'administrator',
    displayName: 'Administrator',
    scope: 'organization',
    permissions: ['members:read', 'members:status', 'roles:manage'],
    status: 'active',
    isSystemReserved: true,
    description: 'Govern member access and organization status.',
  },
  {
    id: 'role_buyer',
    roleCode: 'buyer',
    displayName: 'Buyer',
    scope: 'organization',
    permissions: ['orders:manage', 'escrow:create'],
    status: 'active',
    isSystemReserved: true,
    description: 'Create procurement orders and manage escrow initiation.',
  },
  {
    id: 'role_compliance',
    roleCode: 'complianceReviewer',
    displayName: 'Compliance Reviewer',
    scope: 'organization',
    permissions: ['compliance:review', 'eligibility:update'],
    status: 'active',
    isSystemReserved: true,
    description: 'Review onboarding eligibility and compliance decisions.',
  },
];

const localAccessHistory: AccessHistoryEvent[] = [
  {
    eventId: 'evt_admin_status_review',
    occurredAt: '2026-05-24T11:10:00.000Z',
    actorUserId: 'demo-admin-user',
    action: 'updateMemberOrganizationStatus',
    targetType: 'memberOrganization',
    targetId: 'org_amanah_supply',
    outcome: 'success',
    module: 'membership',
    evidence: {
      payloadHash: 'sha256:7b2a-local-preview',
      canonicalization: 'json-stable-v1',
    },
  },
  {
    eventId: 'evt_buyer_admin_denied',
    occurredAt: '2026-05-24T11:18:00.000Z',
    actorUserId: 'demo-buyer-user',
    action: 'listMemberOrganizations',
    targetType: 'memberOrganization',
    targetId: 'all',
    outcome: 'forbidden',
    reason: 'administrator_required',
    module: 'membership',
    evidence: {
      payloadHash: 'sha256:36dd-local-preview',
      canonicalization: 'json-stable-v1',
    },
  },
];

const emptyAssignmentForm: AssignmentFormState = {
  mode: 'assign',
  userId: 'demo-buyer-user',
  organizationId: 'org_nusantara_procurement',
  roleId: 'role_buyer',
  newRoleId: 'role_compliance',
};

const statusActions: MemberOrganizationStatus[] = [
  'pendingReview',
  'active',
  'inactive',
  'suspended',
  'deleted',
];

const statusLabels: Record<MemberOrganizationStatus, string> = {
  pendingReview: 'Pending review',
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  deleted: 'Deleted',
};

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

function statusClass(status: MemberOrganizationStatus): string {
  switch (status) {
    case 'active':
      return 'admin-status admin-status-active';
    case 'suspended':
    case 'deleted':
      return 'admin-status admin-status-danger';
    case 'inactive':
      return 'admin-status admin-status-muted';
    case 'pendingReview':
    default:
      return 'admin-status admin-status-pending';
  }
}

function renderApiError(error: BackendApiError | null) {
  if (!error) {
    return null;
  }

  return (
    <div className="admin-alert admin-alert-error" role="alert">
      <strong>{error.code === 'FORBIDDEN' ? 'Access denied' : 'Action could not be completed'}</strong>
      <span>{error.message}</span>
    </div>
  );
}

function AdminDashboard({ activeTarget, session }: AdminDashboardProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [organizations, setOrganizations] = useState<MemberOrganizationResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [accessEvents, setAccessEvents] = useState<AccessHistoryEvent[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>();
  const [error, setError] = useState<BackendApiError | null>(null);
  const [statusActionId, setStatusActionId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(emptyAssignmentForm);
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminWorkspace() {
      setLoadState('loading');
      setError(null);

      if (session.source !== 'backend') {
        setOrganizations(localMemberOrganizations);
        setRoles(localRoles);
        setAccessEvents(localAccessHistory);
        setSelectedOrganizationId(current => current ?? localMemberOrganizations[0]?.id);
        setLoadState('ready');
        return;
      }

      try {
        const [nextOrganizations, nextRoles, nextEvents] = await Promise.all([
          listMemberOrganizations(session),
          listRoles(session),
          listAccessHistory(session),
        ]);

        if (cancelled) {
          return;
        }

        setOrganizations(nextOrganizations);
        setRoles(nextRoles);
        setAccessEvents(nextEvents);
        setSelectedOrganizationId(current => current ?? nextOrganizations[0]?.id);
        setLoadState('ready');
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setOrganizations([]);
        setRoles([]);
        setAccessEvents([]);
        setError(normalizeApiError(loadError));
        setLoadState('error');
      }
    }

    void loadAdminWorkspace();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const selectedOrganization = useMemo(
    () => organizations.find(organization => organization.id === selectedOrganizationId) ?? organizations[0],
    [organizations, selectedOrganizationId],
  );

  const activeMembers = organizations.filter(organization => organization.status === 'active').length;
  const restrictedMembers = organizations.filter(organization =>
    organization.status === 'suspended' || organization.status === 'inactive'
  ).length;
  const forbiddenEvents = accessEvents.filter(event => event.outcome === 'forbidden').length;

  const updateSelectedOrganizationStatus = async (status: MemberOrganizationStatus) => {
    if (!selectedOrganization) {
      return;
    }

    setStatusActionId(status);
    setError(null);

    if (session.source !== 'backend') {
      setOrganizations(current => current.map(organization =>
        organization.id === selectedOrganization.id
          ? { ...organization, status, updatedAt: new Date().toISOString() }
          : organization
      ));
      setStatusActionId(null);
      return;
    }

    try {
      const updatedOrganization = await updateMemberOrganizationStatus(selectedOrganization.id, status, session);
      setOrganizations(current => current.map(organization =>
        organization.id === updatedOrganization.id ? updatedOrganization : organization
      ));
    } catch (updateError) {
      setError(normalizeApiError(updateError));
    } finally {
      setStatusActionId(null);
    }
  };

  const updateAssignmentForm = (field: keyof AssignmentFormState, value: string) => {
    setAssignmentForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const handleAssignmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignmentBusy(true);
    setAssignmentMessage(null);
    setError(null);

    if (session.source !== 'backend') {
      const actionLabel = assignmentForm.mode === 'assign'
        ? 'Role assignment prepared'
        : assignmentForm.mode === 'change'
          ? 'Role change prepared'
          : 'Role revocation prepared';
      setAssignmentMessage(`${actionLabel} for ${assignmentForm.userId}.`);
      setAssignmentBusy(false);
      return;
    }

    try {
      if (assignmentForm.mode === 'assign') {
        await createRoleAssignment({
          userId: assignmentForm.userId,
          organizationId: assignmentForm.organizationId,
          roleId: assignmentForm.roleId,
        }, session);
        setAssignmentMessage('Role assignment saved.');
      } else if (assignmentForm.mode === 'change') {
        await changeRoleAssignment({
          userId: assignmentForm.userId,
          organizationId: assignmentForm.organizationId,
          currentRoleId: assignmentForm.roleId,
          newRoleId: assignmentForm.newRoleId,
        }, session);
        setAssignmentMessage('Role assignment changed.');
      } else {
        await removeRoleAssignment({
          userId: assignmentForm.userId,
          organizationId: assignmentForm.organizationId,
          roleId: assignmentForm.roleId,
        }, session);
        setAssignmentMessage('Role assignment revoked.');
      }
    } catch (assignmentError) {
      setError(normalizeApiError(assignmentError));
    } finally {
      setAssignmentBusy(false);
    }
  };

  if (loadState === 'loading') {
    return (
      <section className="workspace-panel">
        <h2>Administration workspace</h2>
        <p>Loading member governance, roles, and access evidence.</p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="workspace-panel">
        <h2>Administration workspace</h2>
        <p>Administrator services are not available for this session.</p>
        {renderApiError(error)}
      </section>
    );
  }

  if (activeTarget === 'members') {
    return (
      <div className="admin-workspace">
        {renderApiError(error)}
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h2>Members</h2>
              <p>Review organization status and apply governed status changes.</p>
            </div>
            <span className="admin-count">{organizations.length} organizations</span>
          </div>

          <div className="admin-member-layout">
            <div className="admin-list" aria-label="Member organizations">
              {organizations.map(organization => (
                <button
                  className={organization.id === selectedOrganization?.id ? 'admin-list-row admin-list-row-active' : 'admin-list-row'}
                  key={organization.id}
                  type="button"
                  onClick={() => setSelectedOrganizationId(organization.id)}
                >
                  <span>{organization.displayName ?? organization.legalName}</span>
                  <strong className={statusClass(organization.status)}>{statusLabels[organization.status]}</strong>
                </button>
              ))}
            </div>

            {selectedOrganization ? (
              <section className="admin-detail-panel" aria-label="Member organization detail">
                <div className="admin-section-header">
                  <div>
                    <h3>{selectedOrganization.displayName ?? selectedOrganization.legalName}</h3>
                    <p>{selectedOrganization.legalName}</p>
                  </div>
                  <strong className={statusClass(selectedOrganization.status)}>
                    {statusLabels[selectedOrganization.status]}
                  </strong>
                </div>

                <dl className="admin-definition-grid">
                  <div>
                    <dt>Registration</dt>
                    <dd>{selectedOrganization.registrationNumber}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{selectedOrganization.organizationType}</dd>
                  </div>
                  <div>
                    <dt>Business</dt>
                    <dd>{selectedOrganization.businessType ?? 'Not recorded'}</dd>
                  </div>
                  <div>
                    <dt>Last Updated</dt>
                    <dd>{formatDate(selectedOrganization.updatedAt)}</dd>
                  </div>
                </dl>

                <div className="admin-action-row" aria-label="Organization status actions">
                  {statusActions.map(status => (
                    <button
                      className={status === selectedOrganization.status ? 'button button-secondary' : 'button button-ghost'}
                      disabled={statusActionId !== null || status === selectedOrganization.status}
                      key={status}
                      type="button"
                      onClick={() => void updateSelectedOrganizationStatus(status)}
                    >
                      {statusActionId === status ? 'Saving' : statusLabels[status]}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="empty-product-state">No member organizations are available.</div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (activeTarget === 'roles') {
    return (
      <div className="admin-workspace">
        {renderApiError(error)}
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h2>Roles</h2>
              <p>Inspect active roles and submit governed assignment changes.</p>
            </div>
            <span className="admin-count">{roles.length} roles</span>
          </div>

          <div className="admin-role-grid">
            {roles.map(role => (
              <article className="admin-role-row" key={role.id}>
                <div>
                  <strong>{role.displayName}</strong>
                  <span>{role.description ?? 'Role description is not recorded.'}</span>
                </div>
                <span className={role.status === 'active' ? 'admin-status admin-status-active' : 'admin-status admin-status-muted'}>
                  {role.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <h2>Role Assignment</h2>
          <form className="admin-form" onSubmit={handleAssignmentSubmit}>
            <label>
              Action
              <select
                value={assignmentForm.mode}
                onChange={event => updateAssignmentForm('mode', event.target.value as AssignmentMode)}
              >
                <option value="assign">Assign role</option>
                <option value="change">Change role</option>
                <option value="revoke">Revoke role</option>
              </select>
            </label>
            <label>
              User
              <input
                value={assignmentForm.userId}
                onChange={event => updateAssignmentForm('userId', event.target.value)}
              />
            </label>
            <label>
              Organization
              <input
                value={assignmentForm.organizationId}
                onChange={event => updateAssignmentForm('organizationId', event.target.value)}
              />
            </label>
            <label>
              Current role
              <input
                value={assignmentForm.roleId}
                onChange={event => updateAssignmentForm('roleId', event.target.value)}
              />
            </label>
            {assignmentForm.mode === 'change' && (
              <label>
                New role
                <input
                  value={assignmentForm.newRoleId}
                  onChange={event => updateAssignmentForm('newRoleId', event.target.value)}
                />
              </label>
            )}
            <button className="button button-primary" disabled={assignmentBusy} type="submit">
              {assignmentBusy ? 'Saving' : 'Save role change'}
            </button>
          </form>
          {assignmentMessage && (
            <div className="admin-alert admin-alert-success" role="status">
              <strong>Saved</strong>
              <span>{assignmentMessage}</span>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (activeTarget === 'access-history') {
    return (
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Access History</h2>
            <p>Review governed actions, rejected attempts, and evidence metadata.</p>
          </div>
          <span className="admin-count">{accessEvents.length} events</span>
        </div>

        <div className="admin-event-list">
          {accessEvents.length === 0 ? (
            <div className="empty-product-state">No access events are available.</div>
          ) : accessEvents.map(event => (
            <article className="admin-event-row" key={event.eventId}>
              <div>
                <strong>{event.action}</strong>
                <span>{event.actorUserId} · {event.targetType}</span>
              </div>
              <div>
                <span className={event.outcome === 'success' ? 'admin-status admin-status-active' : 'admin-status admin-status-danger'}>
                  {event.outcome}
                </span>
                <small>{formatDate(event.occurredAt)}</small>
              </div>
              <code>{event.evidence?.payloadHash ?? 'No proof hash recorded'}</code>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Administrator profile and notification preferences will be managed from account settings when connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Administration workspace</h2>
        <p>Govern member organizations, role assignment changes, and access evidence from a protected administrator view.</p>
      </section>
      <section className="metric-panel">
        <span>Members</span>
        <strong>{organizations.length}</strong>
        <p>{activeMembers} active organizations are available for operational workflows.</p>
      </section>
      <section className="metric-panel">
        <span>Restricted</span>
        <strong>{restrictedMembers}</strong>
        <p>Inactive or suspended organizations remain blocked from protected transaction actions.</p>
      </section>
      <section className="metric-panel">
        <span>Access History</span>
        <strong>{forbiddenEvents}</strong>
        <p>Rejected access attempts are inspectable as event metadata for governance review.</p>
      </section>
    </div>
  );
}

export default AdminDashboard;
