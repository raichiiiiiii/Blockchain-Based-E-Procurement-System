import fastify from 'fastify';
import { registerMembershipRoutes } from '../modules/membership/api/routes.js';

const server = fastify();

// Register membership routes
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

start();
