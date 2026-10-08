// WARMUP-3b harness: resolver-хук — Node рвёт extensionless-импорты в ESM,
// а в проекте их пишут без расширений (tsconfig moduleResolution: bundler).
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    const dir = fileURLToPath(base);
    for (const candidate of [`${dir}.ts`, `${dir}.tsx`, `${dir}/index.ts`]) {
      if (existsSync(candidate)) {
        return { url: new URL(`file://${candidate.replace(/\\/g, '/')}`).href, shortCircuit: true };
      }
    }
  }
  return next(specifier, context);
}
