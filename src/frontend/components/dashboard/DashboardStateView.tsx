import type { DashboardStateCode } from '../../lib/dashboard-state-resolver';

type DashboardStateViewProps = {
  state: Exclude<DashboardStateCode, 'ready'>;
  onSignOut?: () => void;
};

const stateContent: Record<Exclude<DashboardStateCode, 'ready'>, { title: string; message: string; tone: string }> = {
  loading: {
    title: 'Preparing your workspace',
    message: 'We are loading your session and role context.',
    tone: 'neutral',
  },
  noRole: {
    title: 'No active role',
    message: 'Your account does not have an active workspace role yet. Contact an administrator for access.',
    tone: 'warning',
  },
  unsupportedRole: {
    title: 'Workspace not available',
    message: 'This role does not have a supported workspace in the demo environment.',
    tone: 'warning',
  },
  pendingReview: {
    title: 'Organization review pending',
    message: 'Your organization is still under review. Operational tools are hidden until review is complete.',
    tone: 'warning',
  },
  inactiveUser: {
    title: 'Account inactive',
    message: 'This account cannot access operational tools. Historical access depends on server authorization.',
    tone: 'blocked',
  },
  suspendedOrganization: {
    title: 'Organization access limited',
    message: 'This organization is not in an operating state. Protected actions are unavailable.',
    tone: 'blocked',
  },
  forbidden: {
    title: 'Access not allowed',
    message: 'That workspace area is not available for your current role.',
    tone: 'blocked',
  },
  backendUnavailable: {
    title: 'Workspace temporarily unavailable',
    message: 'We could not confirm the server-side workspace context. Try again when the service is reachable.',
    tone: 'warning',
  },
};

function DashboardStateView({ state, onSignOut }: DashboardStateViewProps) {
  const content = stateContent[state];

  return (
    <main className={`app-state-page app-state-${content.tone}`}>
      <section className="state-content">
        <p className="state-kicker">{content.tone === 'blocked' ? 'Access limited' : 'Workspace status'}</p>
        <h1>{content.title}</h1>
        <p>{content.message}</p>
        {onSignOut && (
          <button className="button button-primary" type="button" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </section>
    </main>
  );
}

export default DashboardStateView;
