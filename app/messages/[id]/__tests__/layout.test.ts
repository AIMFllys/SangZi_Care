// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageCss = readFileSync(
  resolve(process.cwd(), 'app/messages/[id]/page.module.css'),
  'utf8',
);
const recorderCss = readFileSync(
  resolve(process.cwd(), 'components/messages/VoiceRecorder.module.css'),
  'utf8',
);
const bubbleCss = readFileSync(
  resolve(process.cwd(), 'components/messages/ChatBubble.module.css'),
  'utf8',
);

describe('聊天页窄屏与横屏布局契约', () => {
  it('使用动态视口三行网格，让消息区滚动且 footer 不固定溢出', () => {
    expect(pageCss).toMatch(/\.page\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\) auto/);
    expect(pageCss).toMatch(/\.page\s*\{[\s\S]*?height:\s*min\(100dvh, var\(--chat-viewport-height, 100dvh\)\)/);
    expect(pageCss).toMatch(/\.page\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(pageCss).toMatch(/\.inputArea\s*\{[\s\S]*?position:\s*relative/);
    expect(pageCss).not.toMatch(/\.inputArea\s*\{[^}]*position:\s*fixed/);
    expect(pageCss).toMatch(/@media \(max-width:\s*350px\)[\s\S]*?padding-inline:\s*var\(--space-md\)/);
  });

  it('录音审核浮层不撑高 footer，320px 宽时仍使用可收缩列', () => {
    expect(recorderCss).toMatch(/\.recordingHud,\s*\.reviewPanel\s*\{[\s\S]*?position:\s*absolute/);
    expect(recorderCss).toMatch(/\.actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(pageCss).toMatch(/\.textInputRow\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  });

  it('播放错误不拦截语音录制操作，录音浮层始终位于错误条上方', () => {
    expect(pageCss).toMatch(/\.voiceError\s*\{[\s\S]*?z-index:\s*10/);
    expect(pageCss).toMatch(/\.voiceError\s*\{[\s\S]*?pointer-events:\s*none/);
    expect(recorderCss).toMatch(/\.recordingHud,\s*\.reviewPanel\s*\{[\s\S]*?z-index:\s*20/);
  });

  it('聊天、录音和输入区所有操作控件至少 44px', () => {
    expect(pageCss).toMatch(/\.backBtn,\s*\.modeToggle\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px/);
    expect(pageCss).toMatch(/\.sendBtn\s*\{[\s\S]*?height:\s*48px/);
    expect(recorderCss).toMatch(/\.micBtn\s*\{[\s\S]*?height:\s*52px/);
    expect(recorderCss).toMatch(/\.pendingCancelBtn\s*\{[\s\S]*?min-height:\s*44px/);
    expect(recorderCss).toMatch(
      /\.cancelBtn,\s*\.editBtn,\s*\.sendBtn\s*\{[\s\S]*?min-height:\s*44px/,
    );
    expect(bubbleCss).toMatch(/\.voiceBar\s*\{[\s\S]*?min-height:\s*48px/);
    expect(bubbleCss).toMatch(/\.playIcon\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px/);
  });

  it('矮横屏限制审核浮层高度，并只让长转写内部滚动', () => {
    const landscapeRule = recorderCss.slice(
      recorderCss.indexOf('@media (orientation: landscape) and (max-height: 500px)'),
    );

    expect(landscapeRule).toContain('@media (orientation: landscape) and (max-height: 500px)');
    expect(landscapeRule).toMatch(/\.reviewPanel\s*\{[\s\S]*?max-height:\s*calc\(/);
    expect(landscapeRule).toMatch(/\.reviewPanel\s*\{[\s\S]*?overflow:\s*hidden/);
    expect(landscapeRule).toMatch(/\.transcript\s*\{[\s\S]*?min-height:\s*0/);
    expect(landscapeRule).toMatch(/\.transcript\s*\{[\s\S]*?overflow-y:\s*auto/);
    expect(landscapeRule).toMatch(/\.actions\s*\{[\s\S]*?flex:\s*0 0 auto/);
  });
});
