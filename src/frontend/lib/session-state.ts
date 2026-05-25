export type FrontendActorContext = {
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
};

export type AuthenticatedFrontendSession = {
  status: 'authenticated';
  sessionToken: string;
  sessionId: string;
  expiresAt: string;
  actor: FrontendActorContext;
  source: 'backend' | 'localDemo';
};

export type FrontendSessionState =
  | { status: 'anonymous' }
  | { status: 'authenticating' }
  | AuthenticatedFrontendSession
  | { status: 'expired' }
  | { status: 'error'; message: string };

const SESSION_STORAGE_KEY = 'pls.frontend.session.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFrontendActorContext(value: unknown): value is FrontendActorContext {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.actorUserId === 'string' &&
    Array.isArray(value.actorRoleCodes) &&
    value.actorRoleCodes.every(role => typeof role === 'string') &&
    typeof value.authenticationSessionId === 'string' &&
    value.authenticationMethod === 'localPassword'
  );
}

function isAuthenticatedSession(value: unknown): value is AuthenticatedFrontendSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.status === 'authenticated' &&
    typeof value.sessionToken === 'string' &&
    typeof value.sessionId === 'string' &&
    typeof value.expiresAt === 'string' &&
    isFrontendActorContext(value.actor) &&
    (value.source === 'backend' || value.source === 'localDemo')
  );
}

function isExpired(expiresAt: string): boolean {
  const expiresAtMs = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

export function loadStoredSession(): FrontendSessionState {
  if (typeof window === 'undefined') {
    return { status: 'anonymous' };
  }

  const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) {
    return { status: 'anonymous' };
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isAuthenticatedSession(parsed)) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return { status: 'anonymous' };
    }

    if (isExpired(parsed.expiresAt)) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return { status: 'expired' };
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return { status: 'anonymous' };
  }
}

export function storeSession(session: AuthenticatedFrontendSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
