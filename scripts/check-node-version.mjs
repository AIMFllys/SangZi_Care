import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function supportsNodeVersion(version) {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(version.trim());
  if (!match) return false;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 22 || (major === 22 && minor >= 13);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isDirectInvocation = invokedPath === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  if (!supportsNodeVersion(process.versions.node)) {
    console.error('生产构建需要 Node.js 22.13.0 或更高版本。');
    process.exitCode = 1;
  } else {
    console.log(`[node-gate] Node.js ${process.versions.node}`);
  }
}
