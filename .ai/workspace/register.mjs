// WARMUP-3b harness: регистрация resolver-хука перед импортом .ts
import { register } from 'node:module';
register('./ts-resolver.mjs', import.meta.url);
