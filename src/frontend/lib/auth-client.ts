import { requestJson } from '../api/http-client';
import type { AuthenticatedFrontendSession, FrontendActorContext } from './session-state';

export type LoginCredentials = {
  username: string;
  password: string;
};

type LoginResponse = {
  sessionToken: string;
  sessionId: string;
  expiresAt: string;
  actor: FrontendActorContext;
};

function toAuthenticatedSession(
  response: LoginResponse,
  source: AuthenticatedFrontendSession['source'],
): AuthenticatedFrontendSession {
  return {
    status: 'authenticated',
    sessionToken: response.sessionToken,
    sessionId: response.sessionId,
    expiresAt: response.expiresAt,
    actor: response.actor,
    source,
  };
}

export async function loginWithCredentials(credentials: LoginCredentials): Promise<AuthenticatedFrontendSession> {
  const response = await requestJson<LoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  return toAuthenticatedSession(response, 'backend');
}

export async function logoutSession(session: AuthenticatedFrontendSession): Promise<void> {
  if (session.source !== 'backend') {
    return;
  }

  await requestJson<{ loggedOut: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.sessionToken}`,
    },
  });
}
