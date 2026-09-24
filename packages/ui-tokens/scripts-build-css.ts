import { writeFileSync } from 'node:fs';

import { generateTokensCss } from './src/css';

writeFileSync(new URL('./tokens.css', import.meta.url), generateTokensCss());
console.warn('tokens.css written');
