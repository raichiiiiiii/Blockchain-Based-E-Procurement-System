import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createValidationError, mapFastifyValidationError, createApplicationValidationError } from './validation-error-helper.js';
import type { FastifyError } from 'fastify';

// Mock FastifyError for testing
const mockFastifyError = (): FastifyError =>
  ({
    name: 'FastifyError',
    message: 'Validation failed',
    code: 'FST_ERR_VALIDATION',
    statusCode: 400,
    validation: [
      {
        keyword: 'required',
        instancePath: '/name',
        schemaPath: '#/required',
        params: { missingProperty: 'name' },
        message: "must have required property 'name'"
      }
    ]
  }) as unknown as FastifyError;

describe('validation-error-helper', () => {
  test('createValidationError with default issues', () => {
    const result = createValidationError();
    
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues: []
        }
      }
    });
    
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(result.error.message, 'Request validation failed');
    assert.ok(Array.isArray(result.error.details.issues));
  });

  test('createValidationError with custom issues', () => {
    const issues = ['Field is required', 'Invalid format'];
    const result = createValidationError(issues);
    
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues
        }
      }
    });
    
    assert.deepEqual(result.error.details.issues, issues);
  });

  test('createValidationError with message and issues', () => {
    const issues = ['Field is required'];
    const result = createValidationError('Custom validation message', issues);
    
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Custom validation message',
        details: {
          issues
        }
      }
    });
    
    assert.strictEqual(result.error.message, 'Custom validation message');
  });

  test('createValidationError with requestId', () => {
    const result = createValidationError(undefined, undefined, 'req_123');
    
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues: []
        },
        requestId: 'req_123'
      }
    });
    
    assert.strictEqual(result.error.requestId, 'req_123');
  });

  test('createValidationError without requestId', () => {
    const result = createValidationError();
    
    assert.strictEqual(Object.hasOwn(result.error, 'requestId'), false);
  });

  test('createValidationError with message only (backward compatibility)', () => {
    const result = createValidationError('Some message');
    
    assert.deepEqual(result, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some message',
        details: {
          issues: []
        }
      }
    });
  });

  test('mapFastifyValidationError preserves VALIDATION_ERROR envelope', () => {
    const error = mockFastifyError();
    const result = mapFastifyValidationError(error);
    
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(result.error.message, 'Request validation failed');
    assert.ok(Array.isArray(result.error.details.issues));
    assert.strictEqual(result.error.details.issues.length, 1);
  });

  test('mapFastifyValidationError with requestId', () => {
    const error = mockFastifyError();
    const result = mapFastifyValidationError(error, 'req_456');
    
    assert.strictEqual(result.error.requestId, 'req_456');
  });

  test('application-level validation helper produces the same envelope family', () => {
    const result = createApplicationValidationError('Application validation failed', ['Invalid state'], 'req_789');
    
    assert.strictEqual(result.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(result.error.message, 'Application validation failed');
    assert.deepEqual(result.error.details.issues, ['Invalid state']);
    assert.strictEqual(result.error.requestId, 'req_789');
  });
  
  test('createValidationError with null requestId does not include requestId field', () => {
    const result = createValidationError('Test message', [], null);
    
    assert.strictEqual(Object.hasOwn(result.error, 'requestId'), false);
  });
});
