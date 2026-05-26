import { createHash } from 'node:crypto';

function sortForCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalJson);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForCanonicalJson(entry)]),
    );
  }

  return value;
}

export function createContractTermsHash(value: unknown): string {
  const canonical = JSON.stringify(sortForCanonicalJson(value));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
