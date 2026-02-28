import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { jsBridge } from '../jsbridge';
import type { JSBridge } from '../jsbridge';

// Helper to create a mock AndroidBridge
function createMockBridge() {
  return {
    makePhoneCall: vi.fn(),
    ttsSpeak: vi.fn(),
    ttsStop: vi.fn(),
    ttsIsAvailable: vi.fn(),
    asrStart: vi.fn(),
    asrStop: vi.fn(),
    asrIsAvailable: vi.fn(),
    storageGetItem: vi.fn(),
    storageSetItem: vi.fn(),
    storageRemoveItem: vi.fn(),
  };
}

describe('JSBridge', () => {
  let bridge: JSBridge;

  beforeEach(() => {
    bridge = jsBridge;
    // Clean up any previous mock
    delete (window as unknown as Record<string, unknown>).AndroidBridge;
    delete (window as unknown as Record<string, unknown>).__jsBridgeCallbacks;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).AndroidBridge;
    delete (window as unknown as Record<string, unknown>).__jsBridgeCallbacks;
    vi.restoreAllMocks();
  });

  // ------ isInWebView ------

  describe('isInWebView', () => {
    it('returns false when AndroidBridge is not present', () => {
      expect(bridge.isInWebView).toBe(false);
    });

    it('returns true when AndroidBridge is present', () => {
      (window as unknown as Record<string, unknown>).AndroidBridge = createMockBridge();
      expect(bridge.isInWebView).toBe(true);
    });
  });

  // ------ makePhoneCall ------

  describe('makePhoneCall', () => {
    it('calls native bridge when available', async () => {
      const mock = createMockBridge();
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const result = await bridge.makePhoneCall('13800138000');
      expect(result).toBe(true);
      expect(mock.makePhoneCall).toHaveBeenCalledWith('13800138000');
    });

    it('falls back to tel: protocol when not in WebView', async () => {
      // Mock window.location
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: '' },
      });

      const result = await bridge.makePhoneCall('110');
      expect(result).toBe(true);
      expect(window.location.href).toBe('tel:110');

      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      });
    });

    it('falls back to tel: when native call throws', async () => {
      const mock = createMockBridge();
      mock.makePhoneCall.mockImplementation(() => {
        throw new Error('native error');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: '' },
      });

      const result = await bridge.makePhoneCall('120');
      expect(result).toBe(true);
      expect(window.location.href).toBe('tel:120');

      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      });
    });
  });

  // ------ nativeTTS ------

  describe('nativeTTS', () => {
    it('isAvailable returns false when not in WebView', async () => {
      expect(await bridge.nativeTTS.isAvailable()).toBe(false);
    });

    it('isAvailable returns true when native reports true', async () => {
      const mock = createMockBridge();
      mock.ttsIsAvailable.mockImplementation((cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('true');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      expect(await bridge.nativeTTS.isAvailable()).toBe(true);
    });

    it('isAvailable returns false when native reports false', async () => {
      const mock = createMockBridge();
      mock.ttsIsAvailable.mockImplementation((cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('false');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      expect(await bridge.nativeTTS.isAvailable()).toBe(false);
    });

    it('speak resolves when native returns ok', async () => {
      const mock = createMockBridge();
      mock.ttsSpeak.mockImplementation(
        (_text: string, _speed: number, _pitch: number, cbId: string) => {
          window.__jsBridgeCallbacks?.[cbId]?.('ok');
        },
      );
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      await expect(bridge.nativeTTS.speak('你好')).resolves.toBeUndefined();
      expect(mock.ttsSpeak).toHaveBeenCalledWith('你好', 1.0, 1.0, expect.any(String));
    });

    it('speak passes custom speed and pitch', async () => {
      const mock = createMockBridge();
      mock.ttsSpeak.mockImplementation(
        (_text: string, _speed: number, _pitch: number, cbId: string) => {
          window.__jsBridgeCallbacks?.[cbId]?.('success');
        },
      );
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      await bridge.nativeTTS.speak('测试', { speed: 0.8, pitch: 1.2 });
      expect(mock.ttsSpeak).toHaveBeenCalledWith('测试', 0.8, 1.2, expect.any(String));
    });

    it('speak throws when native returns error', async () => {
      const mock = createMockBridge();
      mock.ttsSpeak.mockImplementation(
        (_text: string, _speed: number, _pitch: number, cbId: string) => {
          window.__jsBridgeCallbacks?.[cbId]?.('error: engine not ready');
        },
      );
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      await expect(bridge.nativeTTS.speak('失败')).rejects.toThrow('nativeTTS.speak 失败');
    });

    it('speak gracefully returns when not in WebView', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(bridge.nativeTTS.speak('无桥接')).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
    });

    it('stop calls native ttsStop', () => {
      const mock = createMockBridge();
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      bridge.nativeTTS.stop();
      expect(mock.ttsStop).toHaveBeenCalled();
    });

    it('stop gracefully does nothing when not in WebView', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      bridge.nativeTTS.stop(); // should not throw
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  // ------ nativeASR ------

  describe('nativeASR', () => {
    it('isAvailable returns false when not in WebView', async () => {
      expect(await bridge.nativeASR.isAvailable()).toBe(false);
    });

    it('isAvailable returns true when native reports true', async () => {
      const mock = createMockBridge();
      mock.asrIsAvailable.mockImplementation((cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('true');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      expect(await bridge.nativeASR.isAvailable()).toBe(true);
    });

    it('startRecognition returns transcribed text', async () => {
      const mock = createMockBridge();
      mock.asrStart.mockImplementation((_lang: string, cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('高压135低压88');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const result = await bridge.nativeASR.startRecognition();
      expect(result).toBe('高压135低压88');
      expect(mock.asrStart).toHaveBeenCalledWith('zh-CN', expect.any(String));
    });

    it('startRecognition passes custom language', async () => {
      const mock = createMockBridge();
      mock.asrStart.mockImplementation((_lang: string, cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('hello');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const result = await bridge.nativeASR.startRecognition({ language: 'en-US' });
      expect(result).toBe('hello');
      expect(mock.asrStart).toHaveBeenCalledWith('en-US', expect.any(String));
    });

    it('startRecognition returns empty string when not in WebView', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await bridge.nativeASR.startRecognition();
      expect(result).toBe('');
    });

    it('stopRecognition does not throw when not in WebView', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => bridge.nativeASR.stopRecognition()).not.toThrow();
    });
  });

  // ------ storage ------

  describe('storage', () => {
    it('getItem falls back to localStorage when not in WebView', async () => {
      localStorage.setItem('test-key', 'test-value');
      const result = await bridge.storage.getItem('test-key');
      expect(result).toBe('test-value');
      localStorage.removeItem('test-key');
    });

    it('getItem returns null for missing key in localStorage fallback', async () => {
      const result = await bridge.storage.getItem('nonexistent');
      expect(result).toBeNull();
    });

    it('getItem calls native when bridge is available', async () => {
      const mock = createMockBridge();
      mock.storageGetItem.mockImplementation((key: string, cbId: string) => {
        if (key === 'myKey') {
          window.__jsBridgeCallbacks?.[cbId]?.('myValue');
        }
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const result = await bridge.storage.getItem('myKey');
      expect(result).toBe('myValue');
    });

    it('getItem returns null when native returns empty string', async () => {
      const mock = createMockBridge();
      mock.storageGetItem.mockImplementation((_key: string, cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      const result = await bridge.storage.getItem('empty');
      expect(result).toBeNull();
    });

    it('setItem falls back to localStorage when not in WebView', async () => {
      await bridge.storage.setItem('set-key', 'set-value');
      expect(localStorage.getItem('set-key')).toBe('set-value');
      localStorage.removeItem('set-key');
    });

    it('setItem calls native when bridge is available', async () => {
      const mock = createMockBridge();
      mock.storageSetItem.mockImplementation(
        (_key: string, _value: string, cbId: string) => {
          window.__jsBridgeCallbacks?.[cbId]?.('ok');
        },
      );
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      await bridge.storage.setItem('nativeKey', 'nativeValue');
      expect(mock.storageSetItem).toHaveBeenCalledWith(
        'nativeKey',
        'nativeValue',
        expect.any(String),
      );
    });

    it('removeItem falls back to localStorage when not in WebView', async () => {
      localStorage.setItem('rm-key', 'rm-value');
      await bridge.storage.removeItem('rm-key');
      expect(localStorage.getItem('rm-key')).toBeNull();
    });

    it('removeItem calls native when bridge is available', async () => {
      const mock = createMockBridge();
      mock.storageRemoveItem.mockImplementation((_key: string, cbId: string) => {
        window.__jsBridgeCallbacks?.[cbId]?.('ok');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      await bridge.storage.removeItem('nativeRmKey');
      expect(mock.storageRemoveItem).toHaveBeenCalledWith(
        'nativeRmKey',
        expect.any(String),
      );
    });

    it('storage falls back to localStorage when native call fails', async () => {
      const mock = createMockBridge();
      mock.storageGetItem.mockImplementation(() => {
        throw new Error('native crash');
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      localStorage.setItem('fallback-key', 'fallback-value');
      const result = await bridge.storage.getItem('fallback-key');
      expect(result).toBe('fallback-value');
      localStorage.removeItem('fallback-key');
    });
  });

  // ------ Callback timeout ------

  describe('callback timeout', () => {
    it('nativeTTS.isAvailable rejects on timeout', async () => {
      const mock = createMockBridge();
      // Don't call the callback — simulate timeout
      mock.ttsIsAvailable.mockImplementation(() => {
        // intentionally do nothing
      });
      (window as unknown as Record<string, unknown>).AndroidBridge = mock;

      // isAvailable catches the timeout and returns false
      const result = await bridge.nativeTTS.isAvailable();
      expect(result).toBe(false);
    }, 10_000);
  });
});
