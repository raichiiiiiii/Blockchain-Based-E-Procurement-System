import type { SupportedDashboardRole } from '../lib/dashboard-state-resolver';
import type { DashboardNavigationTarget } from '../lib/role-navigation';

type RoleDashboardRole = Exclude<SupportedDashboardRole, 'buyer' | 'auditor'>;

type DashboardCard = {
  label: string;
  value: string;
  detail: string;
};

type SurfaceView = {
  title: string;
  description: string;
  status: string;
  note: string;
};

type RoleDashboardProfile = {
  title: string;
  description: string;
  cards: DashboardCard[];
  surfaces: Partial<Record<DashboardNavigationTarget, SurfaceView>>;
};

const dashboardProfiles: Record<RoleDashboardRole, RoleDashboardProfile> = {
  administrator: {
    title: 'Administration workspace',
    description: 'Manage member access, organization status, and governed platform controls from the administrator view.',
    cards: [
      {
        label: 'Members',
        value: 'Governed',
        detail: 'Member organization records and statuses are kept separate from buyer and supplier workspaces.',
      },
      {
        label: 'Roles',
        value: 'Controlled',
        detail: 'Role assignment actions remain subject to backend authorization and audit logging.',
      },
      {
        label: 'Access History',
        value: 'Inspectable',
        detail: 'Administrative review uses access history without exposing private business payloads.',
      },
    ],
    surfaces: {
      members: {
        title: 'Members',
        description: 'View member organizations, inspect operating status, and prepare account governance actions.',
        status: 'Server-authorized',
        note: 'Organization activation, suspension, and deletion actions must be accepted by protected backend routes.',
      },
      roles: {
        title: 'Roles',
        description: 'Review role assignments and prepare changes for users within member organizations.',
        status: 'Role controlled',
        note: 'Changing access requires administrator authorization and does not rely on frontend visibility alone.',
      },
      'access-history': {
        title: 'Access History',
        description: 'Inspect governed access events and rejected access attempts for account review.',
        status: 'Read-only review',
        note: 'Audit evidence is shown as metadata and proof references, not raw credential or private payload data.',
      },
    },
  },
  supplier: {
    title: 'Supplier workspace',
    description: 'Review received orders, prepare acknowledgements, and track delivery evidence without seeing buyer-only controls.',
    cards: [
      {
        label: 'Received Orders',
        value: 'Ready',
        detail: 'Assigned order review is separated from buyer order creation.',
      },
      {
        label: 'Delivery Evidence',
        value: 'Metadata only',
        detail: 'Delivery evidence placeholders avoid exposing raw commercial documents.',
      },
      {
        label: 'Escrow',
        value: 'View status',
        detail: 'Escrow status can be inspected when an accepted order is linked.',
      },
    ],
    surfaces: {
      'received-orders': {
        title: 'Received Orders',
        description: 'Review purchase orders assigned to the supplier organization and prepare acknowledgement when eligible.',
        status: 'Awaiting order data',
        note: 'Supplier acknowledgements must be recorded through protected procurement routes before escrow can proceed.',
      },
      'delivery-evidence': {
        title: 'Delivery Evidence',
        description: 'Inspect delivery evidence metadata and status without rendering restricted documents.',
        status: 'Metadata safe',
        note: 'Raw delivery documents are not displayed in this workspace surface.',
      },
      escrow: {
        title: 'Escrow',
        description: 'View escrow state linked to accepted orders involving this supplier organization.',
        status: 'Status only',
        note: 'Escrow creation remains a buyer-controlled action and is not shown for the supplier role.',
      },
    },
  },
  complianceReviewer: {
    title: 'Compliance workspace',
    description: 'Review onboarding eligibility and KYC/AML case metadata before transaction actions are allowed.',
    cards: [
      {
        label: 'Compliance',
        value: 'Redacted',
        detail: 'Case review surfaces use safe evidence metadata rather than raw KYC documents.',
      },
      {
        label: 'Eligibility Status',
        value: 'Gated',
        detail: 'Pending or blocked organizations cannot use protected transaction actions.',
      },
      {
        label: 'Decision Trail',
        value: 'Auditable',
        detail: 'Approve, reject, flag, and block decisions require backend validation.',
      },
    ],
    surfaces: {
      compliance: {
        title: 'Compliance',
        description: 'Review KYC/AML case queues, inspect safe metadata, and record governed case decisions.',
        status: 'Redacted review',
        note: 'Raw KYC/AML documents stay out of dashboard cards and blockchain proof records.',
      },
      'eligibility-status': {
        title: 'Eligibility Status',
        description: 'Inspect whether an organization is eligible for order, escrow, and financing actions.',
        status: 'Transaction gate',
        note: 'Eligibility is enforced by protected workflow routes and is not only a visual status label.',
      },
    },
  },
  shariahReviewer: {
    title: 'Shariah review workspace',
    description: 'Inspect PLS review requests, complete checklist review, and record governed review decisions.',
    cards: [
      {
        label: 'Shariah Review',
        value: 'Checklist based',
        detail: 'Decisions depend on checklist completion and approved workflow states.',
      },
      {
        label: 'Decision Trail',
        value: 'Auditable',
        detail: 'Final review outcomes are recorded for audit and financing reference.',
      },
      {
        label: 'PLS Activation',
        value: 'Approval gated',
        detail: 'Financing activation requires an approved Shariah reference.',
      },
    ],
    surfaces: {
      'shariah-review': {
        title: 'Shariah Review',
        description: 'Review PLS submissions, checklist evidence metadata, and decision history.',
        status: 'Governed workflow',
        note: 'The workspace does not imply guaranteed profit, guaranteed principal, or external payment execution.',
      },
    },
  },
  financier: {
    title: 'Financing workspace',
    description: 'Inspect PLS contracts, Shariah approval references, and distribution records for financing review.',
    cards: [
      {
        label: 'Financing',
        value: 'Review ready',
        detail: 'PLS contract status is shown with approval and distribution references.',
      },
      {
        label: 'Shariah Review',
        value: 'Required',
        detail: 'Activation remains blocked until a valid Shariah approval reference exists.',
      },
      {
        label: 'Distribution',
        value: 'Scenario view',
        detail: 'Distribution views are scenario-level and do not execute external payments.',
      },
    ],
    surfaces: {
      financing: {
        title: 'Financing',
        description: 'View PLS contract status, distribution references, and financing readiness signals.',
        status: 'Approval gated',
        note: 'Financing screens show seedbed scope and do not claim production payment execution.',
      },
      'shariah-review': {
        title: 'Shariah Review',
        description: 'Inspect the Shariah approval reference associated with financing activation.',
        status: 'Reference required',
        note: 'A missing approval reference blocks activation and must remain visible to the financier.',
      },
    },
  },
  regulator: {
    title: 'Reporting workspace',
    description: 'Request export bundles, inspect integrity metadata, and verify proof references for supervisory review.',
    cards: [
      {
        label: 'Export Bundle',
        value: 'Requestable',
        detail: 'Exports are scoped by date range and governed reporting access.',
      },
      {
        label: 'Blockchain Proof',
        value: 'Inspectable',
        detail: 'Proof status remains distinct for pending, missing, unavailable, and mismatch states.',
      },
      {
        label: 'Bundle Integrity',
        value: 'Metadata first',
        detail: 'Bundle verification uses manifest and integrity metadata without implying external portal integration.',
      },
    ],
    surfaces: {
      'export-bundle': {
        title: 'Export Bundle',
        description: 'Prepare reporting exports, inspect bundle status, and review integrity metadata.',
        status: 'Scoped access',
        note: 'Unauthorized requesters must be denied by backend routes even if this navigation item is hidden.',
      },
      'blockchain-proof': {
        title: 'Blockchain Proof',
        description: 'Inspect proof metadata associated with export bundle events and audit records.',
        status: 'Honest proof states',
        note: 'Missing or unavailable proof is shown plainly and never receives a fabricated transaction reference.',
      },
    },
  },
  securityOperator: {
    title: 'Security workspace',
    description: 'Monitor access alerts, proof failures, and denied actions without receiving unrelated business controls.',
    cards: [
      {
        label: 'Security Status',
        value: 'Review',
        detail: 'Security status summarizes access and proof health without exposing restricted payloads.',
      },
      {
        label: 'Access Alerts',
        value: 'Investigate',
        detail: 'Denied actions and suspicious access attempts are separate from administrator role controls.',
      },
      {
        label: 'Proof Failures',
        value: 'Visible',
        detail: 'Proof failure states remain explicit and do not become verified states.',
      },
    ],
    surfaces: {
      'security-status': {
        title: 'Security Status',
        description: 'Review security posture, access alert status, and proof health at a high level.',
        status: 'Read-only status',
        note: 'Security visibility does not grant administrator, compliance, or finance mutation rights.',
      },
      'access-alerts': {
        title: 'Access Alerts',
        description: 'Inspect denied or suspicious access attempts and related event metadata.',
        status: 'Event metadata',
        note: 'Access alert review does not expose raw credentials or private business payloads.',
      },
      'proof-failures': {
        title: 'Proof Failures',
        description: 'Track failed, unavailable, and mismatched proof checks for investigation.',
        status: 'Distinct states',
        note: 'Mismatch, not found, and unavailable outcomes remain visually distinct from verified proof.',
      },
      'denied-actions': {
        title: 'Denied Actions',
        description: 'Review blocked action attempts and authorization outcomes for operational monitoring.',
        status: 'Read-only review',
        note: 'Denied action records support investigation and do not create new privileges.',
      },
    },
  },
};

function renderSurface(surface: SurfaceView) {
  return (
    <section className="workspace-panel">
      <h2>{surface.title}</h2>
      <p>{surface.description}</p>
      <div className="status-row">
        <span className="status-dot status-dot-pending" />
        <span>{surface.status}</span>
      </div>
      <div className="empty-product-state">{surface.note}</div>
    </section>
  );
}

type RoleDashboardProps = {
  role: RoleDashboardRole;
  activeTarget: DashboardNavigationTarget;
};

function RoleDashboard({ role, activeTarget }: RoleDashboardProps) {
  const profile = dashboardProfiles[role];

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Profile, notification, and workspace preferences will use account settings when they are connected.</p>
      </section>
    );
  }

  const surface = profile.surfaces[activeTarget];
  if (activeTarget !== 'dashboard' && surface) {
    return renderSurface(surface);
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>{profile.title}</h2>
        <p>{profile.description}</p>
      </section>
      {profile.cards.map(card => (
        <section className="metric-panel" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <p>{card.detail}</p>
        </section>
      ))}
    </div>
  );
}

export default RoleDashboard;
