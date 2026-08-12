// 客户端与服务端共享的 AI 陪伴动作契约。
// 本文件只包含纯类型与常量，不能引入服务端模块或密钥读取逻辑。

export const AI_ACTION_TYPES = [
  'health_recorded',
  'murmur_saved',
  'murmur_shared',
  'share_consent_required',
  'no_family_recipients',
  'tool_error',
] as const;

export type AIActionType = (typeof AI_ACTION_TYPES)[number];
export type AIActionStatus = 'success' | 'warning' | 'error';

export interface AIAction {
  type: AIActionType;
  label: string;
  status: AIActionStatus;
  /** 兼容既有 API 消费方；其值始终与 status === 'success' 一致。 */
  success: boolean;
}

export interface AIChatResult {
  reply: string;
  actions: AIAction[];
}

export interface AIChatResponse extends AIChatResult {
  session_id: string;
}
