// ============================================================
// 桑梓智护 — AI意图处理器
// 处理语音助手识别到的各种意图，分发到对应的业务逻辑
// 需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.8
// ============================================================

import { fetchApi } from '@/lib/api';

/** 意图识别结果 */
export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

/** 意图处理上下文 */
export interface IntentHandlerContext {
  userId: string;
  familyBinds: Array<{
    bind: { relation: string; elder_id: string; family_id: string };
    user: { id: string; name: string };
  }>;
  sendMessage: (receiverId: string, content: string) => Promise<any>;
  makeCall?: (phoneNumber: string) => void;
  triggerEmergency?: () => void;
}

/** 意图处理结果 */
export interface IntentHandlerResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

// ---- health_record: "高压135低压88" → 解析并写入健康记录 ----

export async function handleHealthRecordIntent(
  result: IntentResult,
  context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  const { systolic, diastolic, blood_sugar, heart_rate, weight, temperature } = result.entities;

  try {
    if (systolic || diastolic) {
      await fetchApi('/api/v1/health/records', {
        method: 'POST',
        body: {
          record_type: 'blood_pressure',
          values: { systolic: Number(systolic), diastolic: Number(diastolic) },
          input_method: 'voice',
        },
      });
      return { success: true, message: `已记录血压：收缩压${systolic}，舒张压${diastolic}` };
    }
    if (blood_sugar) {
      await fetchApi('/api/v1/health/records', {
        method: 'POST',
        body: {
          record_type: 'blood_sugar',
          values: { value: Number(blood_sugar) },
          input_method: 'voice',
        },
      });
      return { success: true, message: `已记录血糖：${blood_sugar}` };
    }
    if (heart_rate) {
      await fetchApi('/api/v1/health/records', {
        method: 'POST',
        body: {
          record_type: 'heart_rate',
          values: { value: Number(heart_rate) },
          input_method: 'voice',
        },
      });
      return { success: true, message: `已记录心率：${heart_rate}次/分` };
    }
    if (weight) {
      await fetchApi('/api/v1/health/records', {
        method: 'POST',
        body: {
          record_type: 'weight',
          values: { value: Number(weight) },
          input_method: 'voice',
        },
      });
      return { success: true, message: `已记录体重：${weight}公斤` };
    }
    if (temperature) {
      await fetchApi('/api/v1/health/records', {
        method: 'POST',
        body: {
          record_type: 'temperature',
          values: { value: Number(temperature) },
          input_method: 'voice',
        },
      });
      return { success: true, message: `已记录体温：${temperature}°C` };
    }
    return { success: false, message: '没有识别到健康数据，请再说一次' };
  } catch {
    return { success: false, message: '健康数据记录失败，请稍后再试' };
  }
}

// ---- medication_confirm: "我吃了药了" → 标记当前待服药物为已完成 ----

export async function handleMedicationConfirmIntent(
  _result: IntentResult,
  _context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  try {
    const plans = await fetchApi<any[]>('/api/v1/medicine/today');
    const pending = plans.filter((p: any) => p.status === 'pending');
    if (pending.length === 0) {
      return { success: true, message: '当前没有待服用的药物' };
    }
    // 确认第一个待服药物
    const first = pending[0];
    await fetchApi('/api/v1/medicine/records', {
      method: 'POST',
      body: { plan_id: first.plan_id, scheduled_time: first.scheduled_time, status: 'taken' },
    });
    return { success: true, message: `已确认服用${first.medicine_name}` };
  } catch {
    return { success: false, message: '用药确认失败，请稍后再试' };
  }
}

// ---- send_message: "给我女儿捂个话" → 发送消息 ----

export async function handleSendMessageIntent(
  result: IntentResult,
  context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  const targetRelation = result.entities.target_relation || result.entities.target || '';
  const messageContent = result.entities.message_content || result.entities.content || '';

  if (!targetRelation) {
    return { success: false, message: '没有识别到要发送的对象，请说清楚要给谁捂话' };
  }

  const matchedBind = context.familyBinds.find((fb) => fb.bind.relation === targetRelation);
  if (!matchedBind) {
    return { success: false, message: `没有找到您的${targetRelation}，请先在设置中绑定家属` };
  }

  if (!messageContent) {
    return { success: false, message: `好的，要给${matchedBind.user.name}说什么呢？` };
  }

  try {
    await context.sendMessage(matchedBind.user.id, messageContent);
    return { success: true, message: `已经把消息发给${matchedBind.user.name}了："${messageContent}"` };
  } catch {
    return { success: false, message: '消息发送失败，请稍后再试' };
  }
}

// ---- make_call: "打电话给我女儿" → 拨打家属电话 ----

export async function handleMakeCallIntent(
  result: IntentResult,
  context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  const targetRelation = result.entities.target_relation || result.entities.target || '';
  if (!targetRelation) {
    return { success: false, message: '没有识别到要打电话的对象' };
  }

  const matchedBind = context.familyBinds.find((fb) => fb.bind.relation === targetRelation);
  if (!matchedBind) {
    return { success: false, message: `没有找到您的${targetRelation}，请先绑定家属` };
  }

  if (context.makeCall) {
    context.makeCall(matchedBind.user.id);
    return { success: true, message: `正在拨打${matchedBind.user.name}的电话` };
  }
  return { success: false, message: '当前设备不支持拨打电话' };
}

// ---- emergency: "紧急呼叫/救命" → 触发紧急呼叫 ----

export async function handleEmergencyIntent(
  _result: IntentResult,
  context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  if (context.triggerEmergency) {
    context.triggerEmergency();
    return { success: true, message: '正在启动紧急呼叫' };
  }
  return { success: false, message: '紧急呼叫功能不可用' };
}

// ---- query_medication: "今天吃什么药" → 语音播报今日用药计划 ----

export async function handleQueryMedicationIntent(
  _result: IntentResult,
  _context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  try {
    const plans = await fetchApi<any[]>('/api/v1/medicine/today');
    if (!plans || plans.length === 0) {
      return { success: true, message: '今天没有需要服用的药物', data: { plans: [] } };
    }
    const summary = plans
      .map((p: any) => `${p.scheduled_time} ${p.medicine_name} ${p.dosage}`)
      .join('；');
    return { success: true, message: `今天的用药计划：${summary}`, data: { plans } };
  } catch {
    return { success: false, message: '查询用药计划失败' };
  }
}

// ---- query_health: "我血压怎么样" → 语音播报最近健康数据 ----

export async function handleQueryHealthIntent(
  result: IntentResult,
  _context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  const recordType = result.entities.record_type || 'blood_pressure';
  try {
    const data = await fetchApi<any>('/api/v1/health/records/latest');
    if (!data) {
      return { success: true, message: '暂无健康记录' };
    }
    // 根据类型格式化
    if (recordType === 'blood_pressure' && data.blood_pressure) {
      const bp = data.blood_pressure;
      const vals = bp.values || {};
      return {
        success: true,
        message: `您最近的血压是收缩压${vals.systolic}，舒张压${vals.diastolic}`,
        data: { record: bp },
      };
    }
    return { success: true, message: '已查询到您的健康数据', data };
  } catch {
    return { success: false, message: '查询健康数据失败' };
  }
}

// ---- 意图分发器 ----

export async function dispatchIntent(
  result: IntentResult,
  context: IntentHandlerContext,
): Promise<IntentHandlerResult> {
  switch (result.intent) {
    case 'health_record':
      return handleHealthRecordIntent(result, context);
    case 'medication_confirm':
      return handleMedicationConfirmIntent(result, context);
    case 'send_message':
      return handleSendMessageIntent(result, context);
    case 'make_call':
      return handleMakeCallIntent(result, context);
    case 'emergency':
      return handleEmergencyIntent(result, context);
    case 'query_medication':
      return handleQueryMedicationIntent(result, context);
    case 'query_health':
      return handleQueryHealthIntent(result, context);
    default:
      return { success: false, message: '暂不支持该操作' };
  }
}
