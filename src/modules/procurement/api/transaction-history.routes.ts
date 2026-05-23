import type { FastifyPluginAsync } from 'fastify';
import { getProcureToPayTransactionHistory } from '../application/procure-to-pay-transaction-history-read-model.js';
import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';

// Define the querystring type for transaction history filters
type TransactionHistoryQuerystring = {
  correlationId?: string;
  // Explicitly exclude unsupported parameters
  [key: string]: string | undefined; // Index signature for unknown parameters
};

// Define plugin options interface
interface TransactionHistoryRoutesOptions {
  repository?: ProcureToPayLifecycleEventRepository;
}

// Helper function to validate transaction history query parameters
function validateTransactionHistoryQuery(query: TransactionHistoryQuerystring): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  const allowedParams = new Set(['correlationId']);

  // Check for unknown parameters
  for (const param in query) {
    if (!allowedParams.has(param)) {
      issues.push({
        path: param,
        message: `Unsupported query parameter: ${param}`
      });
    }
  }

  // Validate correlationId is not blank if provided
  if (query.correlationId !== undefined && query.correlationId.trim() === '') {
    issues.push({
      path: 'correlationId',
      message: 'correlationId cannot be blank'
    });
  }

  return issues;
}

// Create the Fastify plugin for transaction-history routes
const registerTransactionHistoryRoutes: FastifyPluginAsync<TransactionHistoryRoutesOptions> = async (fastify, options) => {
  const { repository } = options;

  // GET /api/v1/procurement/transactions/:caseId/history - Get transaction history
  fastify.get<{
    Params: {
      caseId: string;
    };
    Querystring: TransactionHistoryQuerystring;
  }>(
    '/procurement/transactions/:caseId/history',
    async (request, reply) => {
      const { caseId } = request.params;
      
      // Validate caseId is not blank
      if (!caseId || caseId.trim() === '') {
        return reply.code(400).send(createApplicationValidationError('caseId is required and cannot be blank'));
      }

      // Validate query parameters
      const validationIssues = validateTransactionHistoryQuery(request.query);
      if (validationIssues.length > 0) {
        return reply.code(400).send(createApplicationValidationError('Invalid query parameters', validationIssues));
      }

      // If no repository is provided, return empty result
      if (!repository) {
        return reply.code(200).send({
          data: {
            caseId,
            ordering: {
              primary: 'occurredAt',
              secondary: 'eventId',
              direction: 'ascending'
            },
            completeness: {
              status: 'unknown',
              reason: 'no_events_recorded',
              message: 'No events have been recorded for this case'
            },
            items: []
          }
        });
      }

      // Build input for the read model
      const input = {
        caseId,
        correlationId: request.query.correlationId
      };

      // Call the read model function
      const result = await getProcureToPayTransactionHistory(repository, input);

      // Return the result in the approved response shape
      return reply.code(200).send({
        data: result
      });
    }
  );
};

export { registerTransactionHistoryRoutes };
