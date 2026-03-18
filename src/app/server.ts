import fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { registerMembershipRoutes } from '../modules/membership/api/routes.js';

const server = fastify();

server.register(registerMembershipRoutes, { prefix: '/api/v1' });

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