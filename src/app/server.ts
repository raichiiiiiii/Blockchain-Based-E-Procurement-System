import fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { registerMembershipRoutes } from '../modules/membership/api/routes.js';
import { InMemoryMemberOrganizationRepository } from '../modules/membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganizationRepository } from '../modules/membership/application/member-organization-repository.js';

// Factory function for creating testable servers
export function createTestableServer(options?: {
  audit?: (event: any) => void;
  repository?: MemberOrganizationRepository;
}) {
  const server = fastify();
  
  // Use provided dependencies or defaults
  const memberOrganizationRepository = options?.repository ?? new InMemoryMemberOrganizationRepository();
  const auditCallback = options?.audit ?? ((event: any) => {
    console.info('AUDIT EVENT:', JSON.stringify(event));
  });

  // Pass both repository and audit callback into registerMembershipRoutes
  server.register(registerMembershipRoutes, { 
    prefix: '/api/v1',
    repository: memberOrganizationRepository,
    audit: auditCallback
  });

  return server;
}

// Existing singleton server for normal runtime
const server = createTestableServer();

const PORT = Number(process.env.PORT ?? 3000);

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export { server, start };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start();
}
