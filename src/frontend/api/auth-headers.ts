import type { AuthenticatedFrontendSession } from '../lib/session-state';

export function createSessionHeaders(session?: AuthenticatedFrontendSession): Record<string, string> {
  if (!session || session.source !== 'backend') {
    return {};
  }

  return {
    Authorization: `Bearer ${session.sessionToken}`,
  };
}
