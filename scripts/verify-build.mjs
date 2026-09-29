import { fileURLToPath } from 'node:url';
import { verifyBuild } from './artifact-evidence.mjs';

const result = await verifyBuild(fileURLToPath(new URL('../', import.meta.url)));
console.log(`Integridad verificada: ${result.artifact}, SHA-256 ${result.sha256}`);
