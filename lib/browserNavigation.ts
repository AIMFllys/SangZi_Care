type BrowserLocationReplacer = Pick<Location, 'replace'>;

/**
 * 触发整页导航，让根级客户端状态从持久化会话重新初始化。
 */
export function replaceDocument(
  path: string,
  location: BrowserLocationReplacer = window.location,
): void {
  location.replace(path);
}
