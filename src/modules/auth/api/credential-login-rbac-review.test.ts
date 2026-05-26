import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../application/session-token.js';
import type { AuthSession } from '../domain/auth-session.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

function readWorkspaceFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), 'utf8');
}

function createSession(token: string, roleCodes: string[]): AuthSession {
  const roleSlug = roleCodes.join('-') || 'no-role';

  return {
    sessionId: `session-${roleSlug}`,
    tokenHash: hashToken(token),
    actorUserId: `user-${roleSlug}`,
    actorOrganizationId: `org-${roleSlug}`,
    actorRoleCodes: roleCodes,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  };
}

test('login page source exposes credential form only and no role shortcut surface', () => {
  const loginPage = readWorkspaceFile('src/frontend/pages/LoginPage.tsx');
  const app = readWorkspaceFile('src/frontend/App.tsx');
  const authClient = readWorkspaceFile('src/frontend/lib/auth-client.ts');
  const shortcutCopy = ['Continue', 'as'].join(' ');
  const demoGridClass = ['demo', 'account', 'grid'].join('-');
  const demoHandlerProp = ['onDemo', 'SignIn'].join('');
  const demoLoginFunction = ['loginWith', 'DemoAccount'].join('');

  assert.equal(loginPage.includes(shortcutCopy), false);
  assert.equal(loginPage.includes(demoGridClass), false);
  assert.equal(loginPage.includes(demoHandlerProp), false);
  assert.equal(loginPage.includes('Use issued credentials to access your workspace.'), true);
  assert.equal(app.includes(demoHandlerProp), false);
  assert.equal(app.includes(demoLoginFunction), false);
  assert.equal(authClient.includes(shortcutCopy), false);
});

test('strict runtime mode rejects forged admin actor headers on role routes', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const server = createTestableServer({
    sessionRepository,
    enforceBearerAuthForLegacyActorRoutes: true,
  });

  try {
    await server.ready();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/roles',
      headers: {
        'x-actor-role': 'administrator',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await server.close();
  }
});

test('strict runtime mode authorizes roles from bearer session rather than client headers', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  await sessionRepository.save(createSession('admin-token', ['administrator']));
  await sessionRepository.save(createSession('buyer-token', ['buyer']));

  const server = createTestableServer({
    sessionRepository,
    enforceBearerAuthForLegacyActorRoutes: true,
  });

  try {
    await server.ready();

    const adminResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/roles',
      headers: {
        authorization: 'Bearer admin-token',
      },
    });
    assert.equal(adminResponse.statusCode, 200);

    const buyerResponse = await server.inject({
      method: 'GET',
      url: '/api/v1/roles',
      headers: {
        authorization: 'Bearer buyer-token',
        'x-actor-role': 'administrator',
      },
    });
    assert.equal(buyerResponse.statusCode, 403);
    assert.equal(buyerResponse.json().error.code, 'FORBIDDEN');
  } finally {
    await server.close();
  }
});

test('strict runtime mode rejects forged proof roles without bearer session', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const server = createTestableServer({
    sessionRepository,
    enforceBearerAuthForLegacyActorRoutes: true,
  });

  try {
    await server.ready();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/blockchain/anchors/event-1',
      headers: {
        'x-actor-role': 'auditor',
      },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  } finally {
    await server.close();
  }
});

test('strict runtime mode permits blockchain proof reads for auditor bearer session', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  await sessionRepository.save(createSession('auditor-token', ['auditor']));

  const server = createTestableServer({
    sessionRepository,
    enforceBearerAuthForLegacyActorRoutes: true,
  });

  try {
    await server.ready();
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/blockchain/anchors/event-1',
      headers: {
        authorization: 'Bearer auditor-token',
      },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.eventId, 'event-1');
  } finally {
    await server.close();
  }
});
