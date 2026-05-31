import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const specPath = 'docs/contracts/openapi/openapi.yaml';

const text = await readFile(specPath, 'utf8');
const spec = YAML.parse(text);

if (!spec || spec.openapi !== '3.1.0') {
  throw new Error('OpenAPI spec must declare openapi: 3.1.0');
}

if (!spec.paths || Object.keys(spec.paths).length === 0) {
  throw new Error('OpenAPI spec must declare at least one path');
}

const missingOperationIds = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!['get', 'post', 'patch', 'put', 'delete'].includes(method)) {
      continue;
    }

    if (!operation?.operationId) {
      missingOperationIds.push(`${method.toUpperCase()} ${path}`);
    }
  }
}

if (missingOperationIds.length > 0) {
  throw new Error(`OpenAPI operations missing operationId: ${missingOperationIds.join(', ')}`);
}

if (!spec.components?.securitySchemes?.bearerSession) {
  throw new Error('OpenAPI spec must declare bearerSession security scheme');
}

if (!spec.components?.securitySchemes?.oauth2) {
  throw new Error('OpenAPI spec must declare oauth2 readiness security scheme');
}

console.log(`OpenAPI validation passed for ${specPath} with ${Object.keys(spec.paths).length} path(s).`);
