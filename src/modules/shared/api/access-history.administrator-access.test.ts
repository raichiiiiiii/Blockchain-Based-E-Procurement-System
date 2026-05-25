import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

test('administrator role can query access history as read-only governance evidence', async () => {
  const server = createTestableServer();
  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'demo-admin-user',
      'x-actor-role': 'administrator'
    }
  });

  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(response.json().data.items, []);
});
