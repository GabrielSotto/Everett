import { fileURLToPath } from 'node:url';
import { developmentConfig } from './scripts/development.mjs';

export default await developmentConfig(fileURLToPath(new URL('./', import.meta.url)));
