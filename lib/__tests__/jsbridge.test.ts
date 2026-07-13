import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsBridge } from '../jsbridge';

function createMockBridge() {
  return {
    makePhoneCall: vi.fn(),
    storageGetItem: vi.fn(),
    storageSetItem: vi.fn(),
    storageRemoveItem: vi.fn(),
  };
}

describe('JSBridge non-voice compatibility surface', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as unknown as Record<string, unknown>).AndroidBridge;
    delete (window as unknown as Record<string, unknown>).__jsBridgeCallbacks;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete (window as unknown as Record<string, unknown>).AndroidBridge;
    delete (window as unknown as Record<string, unknown>).__jsBridgeCallbacks;
  });

  it('只保留电话和存储，不再暴露 Native ASR/TTS', () => {
    expect(jsBridge).not.toHaveProperty('nativeASR');
    expect(jsBridge).not.toHaveProperty('nativeTTS');
    expect(jsBridge).toHaveProperty('makePhoneCall');
    expect(jsBridge).toHaveProperty('storage');
  });

  it('按 AndroidBridge 是否存在识别 WebView', () => {
    expect(jsBridge.isInWebView).toBe(false);
    (window as unknown as Record<string, unknown>).AndroidBridge = createMockBridge();
    expect(jsBridge.isInWebView).toBe(true);
  });

  it('有桥接时调用原生电话能力', async () => {
    const bridge = createMockBridge();
    (window as unknown as Record<string, unknown>).AndroidBridge = bridge;

    await expect(jsBridge.makePhoneCall('120')).resolves.toBe(true);
    expect(bridge.makePhoneCall).toHaveBeenCalledWith('120');
  });

  it('无桥接时退回 tel 协议', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });

    await expect(jsBridge.makePhoneCall('110')).resolves.toBe(true);
    expect(window.location.href).toBe('tel:110');

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('原生存储通过一次性 callback 往返', async () => {
    const bridge = createMockBridge();
    bridge.storageGetItem.mockImplementation((_key: string, callbackId: string) => {
      window.__jsBridgeCallbacks?.[callbackId]?.('已保存');
    });
    bridge.storageSetItem.mockImplementation(
      (_key: string, _value: string, callbackId: string) => {
        window.__jsBridgeCallbacks?.[callbackId]?.('ok');
      },
    );
    bridge.storageRemoveItem.mockImplementation((_key: string, callbackId: string) => {
      window.__jsBridgeCallbacks?.[callbackId]?.('ok');
    });
    (window as unknown as Record<string, unknown>).AndroidBridge = bridge;

    await expect(jsBridge.storage.getItem('care')).resolves.toBe('已保存');
    await expect(jsBridge.storage.setItem('care', 'value')).resolves.toBeUndefined();
    await expect(jsBridge.storage.removeItem('care')).resolves.toBeUndefined();
    expect(window.__jsBridgeCallbacks).toEqual({});
  });

  it('无桥接时使用 localStorage', async () => {
    await jsBridge.storage.setItem('care', '本地值');
    await expect(jsBridge.storage.getItem('care')).resolves.toBe('本地值');
    await jsBridge.storage.removeItem('care');
    await expect(jsBridge.storage.getItem('care')).resolves.toBeNull();
  });

  it('原生存储超时后回退 localStorage 并清理 callback', async () => {
    vi.useFakeTimers();
    localStorage.setItem('care', '后备值');
    (window as unknown as Record<string, unknown>).AndroidBridge = createMockBridge();

    const pending = jsBridge.storage.getItem('care');
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toBe('后备值');
    expect(window.__jsBridgeCallbacks).toEqual({});
  });
});
