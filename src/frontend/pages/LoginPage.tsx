import { useState } from 'react';
import type { LoginCredentials } from '../lib/auth-client';

type LoginPageProps = {
  notice?: string;
  isAuthenticating: boolean;
  errorMessage?: string;
  onBack: () => void;
  onCredentialsSignIn: (credentials: LoginCredentials) => Promise<void>;
};

function LoginPage({
  notice,
  isAuthenticating,
  errorMessage,
  onBack,
  onCredentialsSignIn,
}: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCredentialsSignIn({ username, password });
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-intro">
          <button className="button button-link" type="button" onClick={onBack}>
            Back to overview
          </button>
          <h1>Sign in</h1>
          <p>Use issued credentials to access your workspace.</p>
          {notice && <p className="login-notice">{notice}</p>}
        </div>

        <div className="login-panel">
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
