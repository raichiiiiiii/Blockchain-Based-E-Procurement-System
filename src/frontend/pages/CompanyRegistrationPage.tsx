import { FormEvent, useState } from 'react';
import { registerOrganization } from '../api/organization-network';
import type { OrganizationProfile } from '../types/organization-network';

type CompanyRegistrationPageProps = {
  onBack: () => void;
  onSignIn: () => void;
};

type RegistrationFormState = {
  legalName: string;
  uniqueIdentifier: string;
  businessCategory: string;
  contactEmail: string;
  primaryAdminUsername: string;
  primaryAdminPassword: string;
  publicProfileSummary: string;
};

const emptyForm: RegistrationFormState = {
  legalName: '',
  uniqueIdentifier: '',
  businessCategory: '',
  contactEmail: '',
  primaryAdminUsername: '',
  primaryAdminPassword: '',
  publicProfileSummary: '',
};

function CompanyRegistrationPage({ onBack, onSignIn }: CompanyRegistrationPageProps) {
  const [form, setForm] = useState<RegistrationFormState>(emptyForm);
  const [registeredOrganization, setRegisteredOrganization] = useState<OrganizationProfile | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const updateField = (field: keyof RegistrationFormState, value: string) => {
    setForm(current => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(undefined);

    try {
      const registration = await registerOrganization({
        legalName: form.legalName.trim(),
        alias: form.legalName.trim(),
        uniqueIdentifier: form.uniqueIdentifier.trim(),
        businessCategory: form.businessCategory.trim(),
        contactEmail: form.contactEmail.trim(),
        publicProfileSummary: form.publicProfileSummary.trim() || undefined,
        primaryAdminUsername: form.primaryAdminUsername.trim(),
        primaryAdminPassword: form.primaryAdminPassword,
        primaryAdminDisplayName: form.primaryAdminUsername.trim(),
      });
      setRegisteredOrganization(registration.organization);
      setForm(emptyForm);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Company registration could not be completed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredOrganization) {
    return (
      <main className="login-page">
        <section className="login-shell company-registration-shell">
          <div className="login-intro">
            <button className="button button-link" type="button" onClick={onBack}>
              Back to overview
            </button>
            <h1>Company registered</h1>
            <p>
              {registeredOrganization.displayName ?? registeredOrganization.legalName} is pending onboarding review.
              Transaction actions stay blocked until eligibility is approved.
            </p>
          </div>
          <div className="login-panel">
            <dl className="admin-definition-grid">
              <div>
                <dt>Company</dt>
                <dd>{registeredOrganization.legalName}</dd>
              </div>
              <div>
                <dt>Identifier</dt>
                <dd>{registeredOrganization.uniqueIdentifier}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{registeredOrganization.status}</dd>
              </div>
              <div>
                <dt>Eligibility</dt>
                <dd>{registeredOrganization.eligibilityStatus}</dd>
              </div>
            </dl>
            <button className="button button-primary button-full" type="button" onClick={onSignIn}>
              Sign in
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-shell company-registration-shell">
        <div className="login-intro">
          <button className="button button-link" type="button" onClick={onBack}>
            Back to overview
          </button>
          <h1>Register company</h1>
          <p>Create a company workspace. Onboarding review is required before transaction actions become available.</p>
        </div>
        <div className="login-panel">
          <form className="login-form" onSubmit={event => void handleSubmit(event)}>
            <label>
              Legal company name
              <input
                value={form.legalName}
                onChange={event => updateField('legalName', event.target.value)}
              />
            </label>
            <label>
              Unique organization identifier
              <input
                value={form.uniqueIdentifier}
                onChange={event => updateField('uniqueIdentifier', event.target.value)}
              />
            </label>
            <label>
              Business category
              <input
                value={form.businessCategory}
                onChange={event => updateField('businessCategory', event.target.value)}
              />
            </label>
            <label>
              Contact email
              <input
                value={form.contactEmail}
                type="email"
                onChange={event => updateField('contactEmail', event.target.value)}
              />
            </label>
            <label>
              Primary admin username
              <input
                value={form.primaryAdminUsername}
                autoComplete="username"
                onChange={event => updateField('primaryAdminUsername', event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                value={form.primaryAdminPassword}
                type="password"
                autoComplete="new-password"
                onChange={event => updateField('primaryAdminPassword', event.target.value)}
              />
            </label>
            <label>
              Public summary
              <textarea
                value={form.publicProfileSummary}
                onChange={event => updateField('publicProfileSummary', event.target.value)}
              />
            </label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register company'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default CompanyRegistrationPage;
