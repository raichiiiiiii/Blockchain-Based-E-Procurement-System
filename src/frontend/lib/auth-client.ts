import { BackendApiError } from '../api/errors';
import { requestJson } from '../api/http-client';
import type { AuthenticatedFrontendSession, FrontendActorContext } from './session-state';

export type DemoAccountId =
  | 'administrator'
  | 'buyer'
  | 'supplier'
  | 'complianceReviewer'
  | 'shariahReviewer'
  | 'financier'
  | 'auditor'
  | 'regulator'
  | 'securityOperator';

export type DemoAccount = {
  id: DemoAccountId;
  label: string;
  roleLabel: string;
  username: string;
  password: string;
  actor: FrontendActorContext;
};

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

const eightHoursFromNow = () => new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

const createDemoToken = (accountId: DemoAccountId) => {
  const tokenSeed = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `local-demo-${accountId}-${tokenSeed}`;
};

export const demoAccounts: DemoAccount[] = [
  {
    id: 'administrator',
    label: 'Continue as Administrator',
    roleLabel: 'Administrator',
    username: 'admin.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-admin-user',
      actorOrganizationId: 'demo-platform-org',
      actorRoleCodes: ['administrator'],
      authenticationSessionId: 'demo-administrator-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'buyer',
    label: 'Continue as Buyer',
    roleLabel: 'Buyer',
    username: 'buyer.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-buyer-user',
      actorOrganizationId: 'demo-buyer-org',
      actorRoleCodes: ['buyer'],
      authenticationSessionId: 'demo-buyer-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'supplier',
    label: 'Continue as Supplier',
    roleLabel: 'Supplier',
    username: 'supplier.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-supplier-user',
      actorOrganizationId: 'demo-supplier-org',
      actorRoleCodes: ['supplier'],
      authenticationSessionId: 'demo-supplier-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'complianceReviewer',
    label: 'Continue as Compliance Reviewer',
    roleLabel: 'Compliance Reviewer',
    username: 'compliance.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-compliance-user',
      actorOrganizationId: 'demo-compliance-org',
      actorRoleCodes: ['complianceReviewer'],
      authenticationSessionId: 'demo-compliance-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'shariahReviewer',
    label: 'Continue as Shariah Reviewer',
    roleLabel: 'Shariah Reviewer',
    username: 'shariah.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-shariah-user',
      actorOrganizationId: 'demo-shariah-org',
      actorRoleCodes: ['shariahReviewer'],
      authenticationSessionId: 'demo-shariah-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'financier',
    label: 'Continue as Financier',
    roleLabel: 'Financier',
    username: 'financier.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-financier-user',
      actorOrganizationId: 'demo-financier-org',
      actorRoleCodes: ['financier'],
      authenticationSessionId: 'demo-financier-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'auditor',
    label: 'Continue as Auditor',
    roleLabel: 'Auditor',
    username: 'auditor.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-auditor-user',
      actorOrganizationId: 'demo-audit-org',
      actorRoleCodes: ['auditor'],
      authenticationSessionId: 'demo-auditor-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'regulator',
    label: 'Continue as Regulator',
    roleLabel: 'Regulator',
    username: 'regulator.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-regulator-user',
      actorOrganizationId: 'demo-regulator-org',
      actorRoleCodes: ['regulator'],
      authenticationSessionId: 'demo-regulator-session',
      authenticationMethod: 'localPassword',
    },
  },
  {
    id: 'securityOperator',
    label: 'Continue as Security Operator',
    roleLabel: 'Security Operator',
    username: 'security.demo',
    password: 'demo-password',
    actor: {
      actorUserId: 'demo-security-user',
      actorOrganizationId: 'demo-security-org',
      actorRoleCodes: ['securityOperator'],
      authenticationSessionId: 'demo-security-session',
      authenticationMethod: 'localPassword',
    },
  },
];

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

function createLocalDemoSession(account: DemoAccount): AuthenticatedFrontendSession {
  const sessionId = `local-${account.id}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;

  return {
    status: 'authenticated',
    sessionToken: createDemoToken(account.id),
    sessionId,
    expiresAt: eightHoursFromNow(),
    actor: {
      ...account.actor,
      authenticationSessionId: sessionId,
    },
    source: 'localDemo',
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

export async function loginWithDemoAccount(accountId: DemoAccountId): Promise<AuthenticatedFrontendSession> {
  const account = demoAccounts.find(candidate => candidate.id === accountId);
  if (!account) {
    throw new BackendApiError('VALIDATION_ERROR', 'Demo account is not available');
  }

  try {
    const backendSession = await loginWithCredentials({
      username: account.username,
      password: account.password,
    });

    if (backendSession.actor.actorRoleCodes.length > 0) {
      return backendSession;
    }
  } catch (error) {
    if (!(error instanceof BackendApiError)) {
      throw error;
    }
  }

  return createLocalDemoSession(account);
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
