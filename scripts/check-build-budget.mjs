import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIB = 1024;
const MIB = 1024 * KIB;

export const ASSET_BUDGET = Object.freeze({
  maxCssFileBytes: 100 * KIB,
  maxCssTotalBytes: 200 * KIB,
  maxJsFileBytes: 250 * KIB,
  maxJsTotalBytes: 1_100 * KIB,
  maxEdgeOneFileBytes: 25 * MIB,
});

export function evaluateAssetBudget(assets) {
  const violations = [];
  const css = assets.filter((asset) => extname(asset.path).toLowerCase() === '.css');
  const js = assets.filter((asset) => extname(asset.path).toLowerCase() === '.js');
  const cssTotal = css.reduce((sum, asset) => sum + asset.bytes, 0);
  const jsTotal = js.reduce((sum, asset) => sum + asset.bytes, 0);

  for (const asset of css) {
    if (asset.bytes > ASSET_BUDGET.maxCssFileBytes) {
      violations.push(`CSS 单文件超出预算: ${asset.path} (${asset.bytes} bytes)`);
    }
  }
  if (cssTotal > ASSET_BUDGET.maxCssTotalBytes) {
    violations.push(`CSS 总量超出预算: ${cssTotal} bytes`);
  }

  for (const asset of js) {
    if (asset.bytes > ASSET_BUDGET.maxJsFileBytes) {
      violations.push(`JS 单文件超出预算: ${asset.path} (${asset.bytes} bytes)`);
    }
  }
  if (jsTotal > ASSET_BUDGET.maxJsTotalBytes) {
    violations.push(`JS 总量超出预算: ${jsTotal} bytes`);
  }

  for (const asset of assets) {
    if (asset.bytes > ASSET_BUDGET.maxEdgeOneFileBytes) {
      violations.push(`EdgeOne 单文件超出 25 MiB: ${asset.path}`);
    }
  }

  return violations;
}

export function evaluateEdgeOneFileLimit(assets) {
  return assets
    .filter((asset) => asset.bytes > ASSET_BUDGET.maxEdgeOneFileBytes)
    .map((asset) => `EdgeOne 单文件超出 25 MiB: ${asset.path}`);
}

function collectAssets(directory, root = directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectAssets(absolutePath, root);
    if (!entry.isFile()) return [];
    return [{
      path: relative(root, absolutePath).replaceAll('\\', '/'),
      bytes: statSync(absolutePath).size,
    }];
  });
}

export function collectDeploymentAssets({
  nextDirectory = resolve('.next'),
  publicDirectory = resolve('public'),
} = {}) {
  const assets = [];

  if (existsSync(nextDirectory)) {
    for (const entry of readdirSync(nextDirectory, { withFileTypes: true })) {
      if (entry.name === 'cache' || entry.name === 'dev') continue;

      const absolutePath = resolve(nextDirectory, entry.name);
      const collected = entry.isDirectory()
        ? collectAssets(absolutePath, nextDirectory)
        : entry.isFile()
          ? [{ path: entry.name, bytes: statSync(absolutePath).size }]
          : [];
      assets.push(...collected.map((asset) => ({
        ...asset,
        path: `.next/${asset.path}`,
      })));
    }
  }

  if (existsSync(publicDirectory)) {
    assets.push(...collectAssets(publicDirectory, publicDirectory).map((asset) => ({
      ...asset,
      path: `public/${asset.path}`,
    })));
  }

  return assets;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
const isDirectInvocation = invokedPath === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  const staticDirectory = resolve('.next/static');
  if (!existsSync(staticDirectory)) {
    console.error('未找到 .next/static；请先完成 Next.js 生产构建。');
    process.exitCode = 1;
  } else {
    const assets = collectAssets(staticDirectory);
    const deploymentAssets = collectDeploymentAssets();
    const violations = [
      ...evaluateAssetBudget(assets),
      ...evaluateEdgeOneFileLimit(deploymentAssets),
    ];
    if (violations.length > 0) {
      for (const violation of violations) console.error(`[asset-budget] ${violation}`);
      process.exitCode = 1;
    } else {
      const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
      console.log(
        `[asset-budget] ${assets.length} static files, ${totalBytes} bytes; `
        + `${deploymentAssets.length} deployment files checked`,
      );
    }
  }
}
