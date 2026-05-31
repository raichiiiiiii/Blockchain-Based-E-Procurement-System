import { FormEvent, useEffect, useState } from 'react';
import {
  getOwnOrganizationProfile,
  updateOwnOrganizationProfile,
} from '../api/organization-network';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { OrganizationProfile } from '../types/organization-network';

type AccountSettingsPageProps = {
  session: AuthenticatedFrontendSession;
};

function AccountSettingsPage({ session }: AccountSettingsPageProps) {
  const [profile, setProfile] = useState<OrganizationProfile | undefined>();
  const [form, setForm] = useState({
    alias: '',
    businessCategory: '',
    publicProfileSummary: '',
    logoUrl: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsLoading(true);
      setError(undefined);

      try {
        const nextProfile = await getOwnOrganizationProfile(session);
        if (!cancelled) {
          setProfile(nextProfile);
          setForm({
            alias: nextProfile.alias ?? nextProfile.displayName ?? '',
            businessCategory: nextProfile.businessCategory ?? '',
            publicProfileSummary: nextProfile.publicProfileSummary ?? '',
            logoUrl: nextProfile.logoUrl ?? '',
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Company profile is unavailable');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session.sessionId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const updated = await updateOwnOrganizationProfile({
        alias: form.alias.trim(),
        businessCategory: form.businessCategory.trim(),
        publicProfileSummary: form.publicProfileSummary.trim(),
        logoUrl: form.logoUrl.trim() || undefined,
      }, session);
      setProfile(updated);
      setMessage('Company profile updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Company profile could not be updated');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Loading account and company profile.</p>
      </section>
    );
  }

  return (
    <div className="account-settings-page">
      <section className="proof-surface-header" aria-label="Settings">
        <p className="dashboard-role-label">Settings</p>
        <h2>Account and company profile</h2>
        <p>View your signed-in account and maintain safe company metadata. Restricted onboarding documents stay hidden.</p>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {message ? <div className="admin-alert admin-alert-success" role="status">{message}</div> : null}

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Account</h3>
              <p>This identity comes from the authenticated backend session.</p>
            </div>
          </div>
          <dl className="admin-definition-grid">
            <div>
              <dt>User</dt>
              <dd>{session.actor.actorUserId}</dd>
            </div>
            <div>
              <dt>Organization</dt>
              <dd>{session.actor.actorOrganizationId ?? 'Not attached'}</dd>
            </div>
            <div>
              <dt>Roles</dt>
              <dd>{session.actor.actorRoleCodes.join(', ') || 'No active role'}</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>{session.sessionId}</dd>
            </div>
          </dl>
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Company profile</h3>
              <p>{profile?.legalName ?? 'Company profile'}</p>
            </div>
          </div>
          <form className="admin-form" onSubmit={event => void handleSubmit(event)}>
            <label>
              Company alias
              <input
                value={form.alias}
                onChange={event => setForm(current => ({ ...current, alias: event.target.value }))}
              />
            </label>
            <label>
              Business category
              <input
                value={form.businessCategory}
                onChange={event => setForm(current => ({ ...current, businessCategory: event.target.value }))}
              />
            </label>
            <label>
              Logo reference URL
              <input
                value={form.logoUrl}
                onChange={event => setForm(current => ({ ...current, logoUrl: event.target.value }))}
              />
            </label>
            <label className="form-field-wide">
              Public summary
              <textarea
                value={form.publicProfileSummary}
                onChange={event => setForm(current => ({ ...current, publicProfileSummary: event.target.value }))}
              />
            </label>
            <button className="button button-primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save company profile'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default AccountSettingsPage;
