// ============================================================
// 桑梓智护 — JSBridge 通信封装
// WebView ↔ Android 原生层通信接口
// ============================================================

// ------ 类型定义 ------

/** Android 原生注入到 window 上的桥接对象 */
interface AndroidBridgeNative {
  makePhoneCall(phoneNumber: string): void;
  ttsSpeak(text: string, speed: number, pitch: number, callbackId: string): void;
  ttsStop(): void;
  ttsIsAvailable(callbackId: string): void;
  asrStart(language: string, callbackId: string): void;
  asrStop(callbackId: string): void;
  asrIsAvailable(callbackId: string): void;
  storageGetItem(key: string, callbackId: string): void;
  storageSetItem(key: string, value: string, callbackId: string): void;
  storageRemoveItem(key: string, callbackId: string): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeNative;
    __jsBridgeCallbacks?: Record<string, (result: string) => void>;
  }
}

/** TTS speak 选项 */
export interface TTSSpeakOptions {
  speed?: number;
  pitch?: number;
}

/** ASR 识别选项 */
export interface ASROptions {
  language?: string;
}

/** NativeTTS 模块接口 */
export interface NativeTTSModule {
  speak(text: string, options?: TTSSpeakOptions): Promise<void>;
  stop(): void;
  isAvailable(): Promise<boolean>;
}

/** NativeASR 模块接口 */
export interface NativeASRModule {
  startRecognition(options?: ASROptions): Promise<string>;
  stopRecognition(): void;
  isAvailable(): Promise<boolean>;
}

/** Storage 模块接口 */
export interface StorageModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** JSBridge 完整接口 */
export interface JSBridge {
  /** 是否运行在 Android WebView 中 */
  readonly isInWebView: boolean;
  makePhoneCall(phoneNumber: string): Promise<boolean>;
  nativeTTS: NativeTTSModule;
  nativeASR: NativeASRModule;
  storage: StorageModule;
}

// ------ 常量 ------

const DEFAULT_TIMEOUT_MS = 5000;

// ------ 回调注册表 ------

let callbackCounter = 0;

function ensureCallbackRegistry(): Record<string, (result: string) => void> {
  if (typeof window === 'undefined') return {};
  if (!window.__jsBridgeCallbacks) {
    window.__jsBridgeCallbacks = {};
  }
  return window.__jsBridgeCallbacks;
}

/**
 * 注册一个一次性回调，返回唯一 callbackId。
 * Android 原生层通过 `window.__jsBridgeCallbacks[id](result)` 回传结果。
 */
function registerCallback(
  resolve: (value: string) => void,
  reject: (reason: Error) => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): string {
  const id = `cb_${Date.now()}_${++callbackCounter}`;
  const registry = ensureCallbackRegistry();

  const timer = setTimeout(() => {
    delete registry[id];
    reject(new Error(`JSBridge 回调超时 (${timeoutMs}ms): ${id}`));
  }, timeoutMs);

  registry[id] = (result: string) => {
    clearTimeout(timer);
    delete registry[id];
    resolve(result);
  };

  return id;
}

/**
 * 创建一个 Promise，自动注册回调并返回 callbackId 供原生调用。
 */
function callNativeAsync(
  invoke: (callbackId: string) => void,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const callbackId = registerCallback(resolve, reject, timeoutMs);
    try {
      invoke(callbackId);
    } catch (err) {
      const registry = ensureCallbackRegistry();
      delete registry[callbackId];
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

// ------ 环境检测 ------

function getBridge(): AndroidBridgeNative | null {
  if (typeof window !== 'undefined' && window.AndroidBridge) {
    return window.AndroidBridge;
  }
  return null;
}

// ------ makePhoneCall ------

async function makePhoneCall(phoneNumber: string): Promise<boolean> {
  const bridge = getBridge();

  if (bridge) {
    try {
      bridge.makePhoneCall(phoneNumber);
      return true;
    } catch {
      // 原生调用失败，降级到 tel: 协议
    }
  }

  // 浏览器环境降级：使用 tel: 协议
  if (typeof window !== 'undefined') {
    window.location.href = `tel:${phoneNumber}`;
    return true;
  }

  return false;
}

// ------ nativeTTS ------

const nativeTTS: NativeTTSModule = {
  async speak(text: string, options?: TTSSpeakOptions): Promise<void> {
    const bridge = getBridge();
    if (!bridge) {
      console.warn('[JSBridge] nativeTTS.speak: 不在 WebView 环境，跳过');
      return;
    }

    const speed = options?.speed ?? 1.0;
    const pitch = options?.pitch ?? 1.0;

    const result = await callNativeAsync((cbId) => {
      bridge.ttsSpeak(text, speed, pitch, cbId);
    });

    if (result !== 'ok' && result !== 'success') {
      throw new Error(`nativeTTS.speak 失败: ${result}`);
    }
  },

  stop(): void {
    const bridge = getBridge();
    if (!bridge) {
      console.warn('[JSBridge] nativeTTS.stop: 不在 WebView 环境，跳过');
      return;
    }
    bridge.ttsStop();
  },

  async isAvailable(): Promise<boolean> {
    const bridge = getBridge();
    if (!bridge) return false;

    try {
      const result = await callNativeAsync((cbId) => {
        bridge.ttsIsAvailable(cbId);
      });
      return result === 'true';
    } catch {
      return false;
    }
  },
};

// ------ nativeASR ------

const nativeASR: NativeASRModule = {
  async startRecognition(options?: ASROptions): Promise<string> {
    const bridge = getBridge();
    if (!bridge) {
      console.warn('[JSBridge] nativeASR.startRecognition: 不在 WebView 环境');
      return '';
    }

    const language = options?.language ?? 'zh-CN';

    const result = await callNativeAsync(
      (cbId) => {
        bridge.asrStart(language, cbId);
      },
      // ASR 可能需要更长时间等待用户说话
      30_000,
    );

    return result;
  },

  stopRecognition(): void {
    const bridge = getBridge();
    if (!bridge) {
      console.warn('[JSBridge] nativeASR.stopRecognition: 不在 WebView 环境，跳过');
      return;
    }

    // 停止识别，结果会通过 startRecognition 的回调返回
    try {
      callNativeAsync((cbId) => {
        bridge.asrStop(cbId);
      }).catch(() => {
        // stop 的回调结果可忽略
      });
    } catch {
      // 忽略 stop 错误
    }
  },

  async isAvailable(): Promise<boolean> {
    const bridge = getBridge();
    if (!bridge) return false;

    try {
      const result = await callNativeAsync((cbId) => {
        bridge.asrIsAvailable(cbId);
      });
      return result === 'true';
    } catch {
      return false;
    }
  },
};

// ------ storage ------

const storage: StorageModule = {
  async getItem(key: string): Promise<string | null> {
    const bridge = getBridge();
    if (!bridge) {
      // 降级到 localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }

    try {
      const result = await callNativeAsync((cbId) => {
        bridge.storageGetItem(key, cbId);
      });
      // 原生层用空字符串表示 null
      return result === '' ? null : result;
    } catch {
      // 降级到 localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const bridge = getBridge();
    if (!bridge) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return;
    }

    try {
      await callNativeAsync((cbId) => {
        bridge.storageSetItem(key, value, cbId);
      });
    } catch {
      // 降级到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    const bridge = getBridge();
    if (!bridge) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
      return;
    }

    try {
      await callNativeAsync((cbId) => {
        bridge.storageRemoveItem(key, cbId);
      });
    } catch {
      // 降级到 localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  },
};

// ------ 导出单例 ------

export const jsBridge: JSBridge = {
  get isInWebView(): boolean {
    return getBridge() !== null;
  },
  makePhoneCall,
  nativeTTS,
  nativeASR,
  storage,
};

export default jsBridge;
