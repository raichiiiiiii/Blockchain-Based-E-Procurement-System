import { createHash } from 'node:crypto';

export function canonicalizeExportValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalizeExportValue(item)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter(key => obj[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalizeExportValue(obj[key])}`)
    .join(',')}}`;
}

export function hashExportValue(value: unknown): string {
  return `sha256:${createHash('sha256').update(canonicalizeExportValue(value)).digest('hex')}`;
}
