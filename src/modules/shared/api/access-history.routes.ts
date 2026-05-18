import type { FastifyPluginAsync } from 'fastify';
import { queryAccessHistory } from '../../shared/application/access-history-query.js';
import { getAccessAuditEventDetail } from '../../shared/application/access-audit-event-detail.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import type { AccessAuditEvent, AccessAuditOutcome, AccessAuditModule } from '../../shared/application/access-audit-event.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';

// Define the querystring type for access history filters
type AccessHistoryQuerystring = {
  actorUserId?: string;
  targetType?: string;
  targetId?: string;
  action?: string;
  outcome?: AccessAuditOutcome;
  occurredFrom?: string;
  occurredTo?: string;
  module?: AccessAuditModule;
  route?: string;
  method?: string;
  // Explicitly exclude unsupported parameters
  limit?: string;
  cursor?: string;
  [key: string]: string | undefined; // Index signature for unknown parameters
};

// Define plugin options interface
interface AccessHistoryRoutesOptions {
  accessAuditEventRepository?: AccessAuditEventRepository;
}

// Validation issue type
type ValidationIssue = {
  path: string;
  message: string;
};

// Helper function to validate access history query parameters
function validateAccessHistoryQuery(query: AccessHistoryQuerystring): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allowedParams = new Set([
    'actorUserId', 'targetType', 'targetId', 'action', 'outcome',
    'occurredFrom', 'occurredTo', 'module', 'route', 'method'
  ]);

  // Check for unknown parameters
  for (const param in query) {
    if (!allowedParams.has(param)) {
      issues.push({
        path: param,
        message: `Unsupported query parameter: ${param}`
      });
    }
  }

  // Validate outcome values
  const validOutcomes: AccessAuditOutcome[] = [
    'success', 'forbidden', 'validationError', 'notFound', 'conflict', 'error'
  ];
  if (query.outcome && !validOutcomes.includes(query.outcome)) {
    issues.push({
      path: 'outcome',
      message: `Invalid outcome value: ${query.outcome}. Must be one of: ${validOutcomes.join(', ')}`
    });
  }

  // Validate module values
  const validModules: AccessAuditModule[] = ['membership', 'access-control', 'shariah-review'];
  if (query.module && !validModules.includes(query.module)) {
    issues.push({
      path: 'module',
      message: `Invalid module value: ${query.module}. Must be one of: ${validModules.join(', ')}`
    });
  }

  // Validate method values
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (query.method && !validMethods.includes(query.method)) {
    issues.push({
      path: 'method',
      message: `Invalid method value: ${query.method}. Must be one of: ${validMethods.join(', ')}`
    });
  }

  // Validate timestamp formats
  if (query.occurredFrom) {
    if (isNaN(Date.parse(query.occurredFrom))) {
      issues.push({
        path: 'occurredFrom',
        message: 'Invalid date format. Must be ISO 8601 compatible.'
      });
    }
  }

  if (query.occurredTo) {
    if (isNaN(Date.parse(query.occurredTo))) {
      issues.push({
        path: 'occurredTo',
        message: 'Invalid date format. Must be ISO 8601 compatible.'
      });
    }
  }

  // Validate time range
  if (query.occurredFrom && query.occurredTo) {
    const fromDate = new Date(query.occurredFrom);
    const toDate = new Date(query.occurredTo);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      // Skip this validation if dates are invalid (already caught above)
    } else if (fromDate > toDate) {
      issues.push({
        path: 'occurredFrom',
        message: 'occurredFrom must be less than or equal to occurredTo'
      });
    }
  }

  return issues;
}

// Create the Fastify plugin for access-history routes
const registerAccessHistoryRoutes: FastifyPluginAsync<AccessHistoryRoutesOptions> = async (fastify, options) => {
  const { accessAuditEventRepository } = options;

  // GET /api/v1/access-history - Query access history
  fastify.get<{
    Querystring: AccessHistoryQuerystring;
  }>(
    '/access-history',
    {
      preHandler: async (request, reply) => {
        // Check if the actor has auditor role using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('auditor')) {
          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'User must have auditor role to query access history'
            }
          });
        }
      }
    },
    async (request, reply) => {
      // Validate query parameters
      const validationIssues = validateAccessHistoryQuery(request.query);
      if (validationIssues.length > 0) {
        return reply.code(400).send(createApplicationValidationError('Invalid query parameters', validationIssues));
      }

      // If no repository is provided, return empty result
      if (!accessAuditEventRepository) {
        return reply.code(200).send({
          data: {
            items: []
          }
        });
      }

      // Build query object from request query parameters
      const query = {
        actorUserId: request.query.actorUserId,
        targetType: request.query.targetType,
        targetId: request.query.targetId,
        action: request.query.action,
        outcome: request.query.outcome,
        occurredFrom: request.query.occurredFrom,
        occurredTo: request.query.occurredTo,
        module: request.query.module,
        route: request.query.route,
        method: request.query.method
      };

      // Call the query service with the provided filters
      const events: AccessAuditEvent[] = await queryAccessHistory(accessAuditEventRepository, query);

      // Return the events in the approved response shape
      return reply.code(200).send({
        data: {
          items: events
        }
      });
    }
  );

  // GET /api/v1/access-history/events/:eventId - Get access audit event detail by eventId
  fastify.get<{
    Params: {
      eventId: string;
    };
  }>(
    '/access-history/events/:eventId',
    {
      preHandler: async (request, reply) => {
        // Check if the actor has auditor role using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('auditor')) {
          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'User must have auditor role to query access history'
            }
          });
        }
      }
    },
    async (request, reply) => {
      // If no repository is provided, return not found
      if (!accessAuditEventRepository) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Access audit event not found'
          }
        });
      }

      // Get the event by eventId using the application function
      const event = await getAccessAuditEventDetail(accessAuditEventRepository, request.params.eventId);

      // If event not found, return 404
      if (!event) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Access audit event not found'
          }
        });
      }

      // Return the event in the approved response shape
      return reply.code(200).send({
        data: {
          event
        }
      });
    }
  );
};

export { registerAccessHistoryRoutes };
