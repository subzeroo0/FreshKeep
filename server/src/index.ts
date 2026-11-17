import { serve } from '@hono/node-server';

import { app } from './app.js';
import { hasKey } from './claude.js';

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, () => {
  console.log(`FreshKeep API on http://localhost:${port} · AI ${hasKey() ? 'enabled' : 'disabled (set ANTHROPIC_API_KEY)'}`);
});
