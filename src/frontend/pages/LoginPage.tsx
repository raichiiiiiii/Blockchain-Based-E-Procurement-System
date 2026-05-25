import { useState } from 'react';
import { demoAccounts, type DemoAccountId, type LoginCredentials } from '../lib/auth-client';

type LoginPageProps = {
  notice?: string;
  isAuthenticating: boolean;
  errorMessage?: string;
  onBack: () => void;
  onDemoSignIn: (accountId: DemoAccountId) => Promise<void>;
  onCredentialsSignIn: (credentials: LoginCredentials) => Promise<void>;
};

function LoginPage({
  notice,
  isAuthenticating,
  errorMessage,
  onBack,
  onDemoSignIn,
  onCredentialsSignIn,
}: LoginPageProps) {
  const [username, setUsername] = useState(demoAccounts[0]?.username ?? '');
  const [password, setPassword] = useState(demoAccounts[0]?.password ?? '');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCredentialsSignIn({ username, password });
  };

  const handleDemoClick = async (accountId: DemoAccountId) => {
    const account = demoAccounts.find(candidate => candidate.id === accountId);
    if (account) {
      setUsername(account.username);
      setPassword(account.password);
    }

    await onDemoSignIn(accountId);
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-intro">
          <button className="button button-link" type="button" onClick={onBack}>
            Back to overview
          </button>
          <h1>Sign in</h1>
          <p>
            Choose a demo account or use issued credentials to enter the procurement workspace.
          </p>
          {notice && <p className="login-notice">{notice}</p>}
        </div>

        <div className="login-panel">
          <div className="demo-account-grid" aria-label="Demo accounts">
            {demoAccounts.map(account => (
              <button
                className="demo-account-button"
                type="button"
                key={account.id}
                disabled={isAuthenticating}
                onClick={() => void handleDemoClick(account.id)}
              >
                <span>{account.label}</span>
                <strong>{account.roleLabel}</strong>
              </button>
            ))}
          </div>

          <form className="login-form" onSubmit={event => void handleSubmit(event)}>
            <label>
              Username
              <input
                value={username}
                autoComplete="username"
                onChange={event => setUsername(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                value={password}
                type="password"
                autoComplete="current-password"
                onChange={event => setPassword(event.target.value)}
              />
            </label>
            {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
            <button className="button button-primary button-full" type="submit" disabled={isAuthenticating}>
              {isAuthenticating ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default LoginPage;
