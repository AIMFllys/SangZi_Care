import { NextResponse } from 'next/server';
import { MimoError, toApiResponse } from '@/lib/server';

const PRIVATE_NO_STORE = 'private, no-store, max-age=0';

interface VoiceRequestContext {
  operation: 'tts' | 'asr';
  requestId: string;
  startedAt: number;
}

export function createVoiceRequestContext(
  operation: VoiceRequestContext['operation'],
): VoiceRequestContext {
  return {
    operation,
    requestId: crypto.randomUUID(),
    startedAt: Date.now(),
  };
}

export function voiceErrorResponse(error: unknown): NextResponse {
  if (error instanceof MimoError) {
    return NextResponse.json({ detail: error.message }, { status: error.status });
  }
  return toApiResponse(error);
}

export function finishVoiceResponse(
  response: NextResponse,
  context: VoiceRequestContext,
  metrics: { textLength?: number; audioBytes?: number },
): NextResponse {
  response.headers.set('Cache-Control', PRIVATE_NO_STORE);
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Vary', 'Authorization');
  response.headers.set('X-Request-Id', context.requestId);

  console.info('[voice-request]', {
    operation: context.operation,
    requestId: context.requestId,
    status: response.status,
    elapsedMs: Date.now() - context.startedAt,
    ...metrics,
  });
  return response;
}
