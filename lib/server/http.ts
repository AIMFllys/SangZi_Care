const PRIVATE_CACHE_CONTROL = 'private, no-store, max-age=0';

function mergeVaryAuthorization(value: string | null): string {
  const fields: string[] = [];
  const seen = new Set<string>();

  for (const field of (value ?? '').split(',')) {
    const trimmed = field.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    fields.push(normalized === 'authorization' ? 'Authorization' : trimmed);
  }

  if (!seen.has('authorization')) fields.push('Authorization');
  return fields.join(', ');
}

/** 为认证或个性化响应设置统一的私有禁缓存策略。 */
export function withPrivateNoStore<T extends Response>(response: T): T {
  response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
  response.headers.set('Pragma', 'no-cache');
  response.headers.set(
    'Vary',
    mergeVaryAuthorization(response.headers.get('Vary')),
  );
  return response;
}
