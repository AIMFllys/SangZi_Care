// ============================================================
// 桑梓智护 — 常量定义
// ============================================================

export const APP_VERSION = '1.3.0';

// ------ 健康数据异常阈值 ------

export const HEALTH_THRESHOLDS = {
  blood_pressure: {
    systolic: { min: 90, max: 140 },
    diastolic: { min: 60, max: 90 },
  },
  blood_sugar: {
    fasting: { min: 3.9, max: 6.1 },
    postprandial: { min: 3.9, max: 7.8 },
  },
  heart_rate: { min: 60, max: 100 },
  temperature: { min: 36.0, max: 37.3 },
  weight: null, // 无固定阈值，基于历史趋势判断
} as const;

// ------ 路由常量 ------

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ONBOARDING: '/onboarding',
  VOICE: '/voice',
  MESSAGES: '/messages',
  MESSAGES_CHAT: (id: string) => `/messages/${id}`,
  MEDICINE: '/medicine',
  MEDICINE_HISTORY: '/medicine/history',
  HEALTH: '/health',
  HEALTH_INPUT: '/health/input',
  RADIO: '/radio',
  FAMILY_DETAIL: (id: string) => `/family/${id}`,
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',
  SETTINGS_ABOUT: '/settings/about',
  SETTINGS_BIND: '/settings/bind',
  SETTINGS_PROFILE: '/settings/profile',
  SETTINGS_ACCESSIBILITY: '/settings/accessibility',
  QUESTIONNAIRE: '/questionnaire',
} as const;
