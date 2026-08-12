import { type NextRequest } from 'next/server';
import { ApiError, requireUser, toApiResponse } from '@/lib/server';

export const runtime = 'nodejs';

/**
 * 通知现已和 trigger 在数据库事务内原子完成。保留此端点只为让旧客户端
 * 得到明确的弃用结果；不得再允许二次改写收件人或伪造已发送时间。
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser(request);
    throw new ApiError(410, '该通知接口已停用，请重新发起紧急求助');
  } catch (error) {
    return toApiResponse(error);
  }
}
