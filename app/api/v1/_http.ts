import { ApiError } from '@/lib/server';

export { withPrivateNoStore } from '@/lib/server';

function assertDeclaredLength(request: Request, maxBytes: number): void {
  const rawLength = request.headers.get('content-length');
  if (rawLength === null) return;

  const normalized = rawLength.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new ApiError(400, 'Content-Length 无效');
  }
  const declaredLength = Number(normalized);
  if (!Number.isSafeInteger(declaredLength)) {
    throw new ApiError(400, 'Content-Length 无效');
  }
  if (declaredLength > maxBytes) {
    throw new ApiError(413, '请求体过大');
  }
}

async function readBoundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  assertDeclaredLength(request, maxBytes);

  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new ApiError(413, '请求体过大');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedJson<T>(
  request: Request,
  maxBytes: number,
): Promise<T> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    throw new ApiError(400, '请求体必须为 JSON');
  }

  const body = await readBoundedBody(request, maxBytes);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(body);
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(400, '请求体必须为 JSON');
  }
}

export async function readBoundedFormData(
  request: Request,
  maxBytes: number,
): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    throw new ApiError(400, '请求体必须为 multipart/form-data');
  }

  const body = await readBoundedBody(request, maxBytes);
  try {
    const boundedRequest = new Request(request.url, {
      method: request.method,
      headers: { 'Content-Type': contentType },
      body: body as BodyInit,
    });
    return await boundedRequest.formData();
  } catch {
    throw new ApiError(400, '请求体必须为 multipart/form-data');
  }
}
