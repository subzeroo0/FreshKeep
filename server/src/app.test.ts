import { describe, expect, it } from 'vitest';

import { app } from './app.js';
import { mapOffCategory } from './products.js';

// Offline checks: validation and error shapes. Live AI checks need ANTHROPIC_API_KEY + /fixtures.
describe('server', () => {
  it('reports health', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('serves seed products without network', async () => {
    const res = await app.request('/products/8901262010016');
    expect(await res.json()).toMatchObject({ found: true, product: { category: 'milk' } });
  });

  it('rejects a bad barcode with 422', async () => {
    expect((await app.request('/products/abc')).status).toBe(422);
  });

  it('rejects a bad image with a readable 422', async () => {
    const res = await app.request('/ai/read-date', { method: 'POST', body: JSON.stringify({ image: 'x' }), headers: { 'content-type': 'application/json' } });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/Invalid request/);
  });

  it('rejects more than 5 order screenshots', async () => {
    const img = 'a'.repeat(200);
    const res = await app.request('/ai/parse-order', { method: 'POST', body: JSON.stringify({ images: Array(6).fill(img) }), headers: { 'content-type': 'application/json' } });
    expect(res.status).toBe(422);
  });

  it('maps Open Food Facts categories', () => {
    expect(mapOffCategory(['en:dairies', 'en:yogurts'])).toBe('curd_yogurt');
    expect(mapOffCategory(['en:snacks'])).toBe('other');
  });
});
