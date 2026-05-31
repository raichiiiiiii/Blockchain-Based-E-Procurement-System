import { FormEvent, useEffect, useState } from 'react';
import {
  inviteOrganizationUser,
  listOrganizationUsers,
} from '../api/organization-network';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { CompanyUserSummary } from '../types/organization-network';

type OrganizationUsersPageProps = {
  session: AuthenticatedFrontendSession;
};

const assignableRoles = [
  'organizationAdmin',
  'buyer',
  'supplier',
  'financier',
  'complianceReviewer',
  'shariahReviewer',
  'auditor',
  'regulator',
  'securityOperator',
];

function formatLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

function OrganizationUsersPage({ session }: OrganizationUsersPageProps) {
  const [users, setUsers] = useState<CompanyUserSummary[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roleCode, setRoleCode] = useState('buyer');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const loadUsers = async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setUsers(await listOrganizationUsers(session));
    } catch (loadError) {
      setUsers([]);
      setError(loadError instanceof Error ? loadError.message : 'Organization users are unavailable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [session.sessionId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const user = await inviteOrganizationUser({
        username: username.trim(),
        displayName: displayName.trim(),
        roleCodes: [roleCode],
      }, session);
      setUsers(current => [...current, user]);
      setUsername('');
      setDisplayName('');
      setRoleCode('buyer');
      setMessage('Company user access prepared. Credentials are issued through the operator process.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Company user could not be prepared');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="organization-users-page">
      <section className="proof-surface-header" aria-label="Company users">
        <p className="dashboard-role-label">Company users</p>
        <h2>Company user management</h2>
        <p>Prepare organization-scoped users and role assignments without switching identity in the browser.</p>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert-success" role="status">{message}</div> : null}

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Users</h3>
              <p>Only users attached to the signed-in company context are shown.</p>
            </div>
            <span className="admin-count">{users.length} users</span>
          </div>
          {isLoading ? <div className="empty-product-state">Loading company users...</div> : null}
          {!isLoading && users.length === 0 ? (
            <div className="empty-product-state">No company users are visible for this account.</div>
          ) : null}
          <div className="admin-role-grid">
            {users.map(user => (
              <article className="admin-role-row" key={user.userId}>
                <div>
                  <strong>{user.displayName ?? user.userId}</strong>
                  <span>{user.username ?? 'No username recorded'}</span>
                  <small>{user.roleCodes.map(formatLabel).join(', ') || 'No role assigned'}</small>
                </div>
                <span className={user.membershipStatus === 'active' ? 'admin-status admin-status-active' : 'admin-status admin-status-pending'}>
                  {formatLabel(user.membershipStatus)}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Prepare access</h3>
              <p>Creates a backend-scoped user record. It does not reveal or email a password from the dashboard.</p>
            </div>
          </div>
          <form className="admin-form" onSubmit={event => void handleSubmit(event)}>
            <label>
              Username
              <input value={username} onChange={event => setUsername(event.target.value)} />
            </label>
            <label>
              Display name
              <input value={displayName} onChange={event => setDisplayName(event.target.value)} />
            </label>
            <label>
              Company role
              <select value={roleCode} onChange={event => setRoleCode(event.target.value)}>
                {assignableRoles.map(role => (
                  <option value={role} key={role}>{formatLabel(role)}</option>
                ))}
              </select>
            </label>
            <button className="button button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Preparing access...' : 'Prepare access'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default OrganizationUsersPage;
