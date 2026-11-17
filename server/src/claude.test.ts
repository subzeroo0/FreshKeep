import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// End-to-end through the real Anthropic SDK against a local mock of the Messages API:
// checks the request we send (images, structured output, fallback) and how replies are parsed.

let server: Server;
const requests: Record<string, unknown>[] = [];
let reply: (body: Record<string, unknown>) => unknown = () => ({});

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw);
      requests.push({ ...body, _headers: req.headers });
      const text = JSON.stringify(reply(body));
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        id: 'msg_test', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn', stop_sequence: null,
        content: [{ type: 'text', text }], usage: { input_tokens: 10, output_tokens: 20 },
      }));
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const port = (server.address() as { port: number }).port;
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
});

afterAll(() => server.close());

const IMG = 'iVBORw0KGgo' + 'A'.repeat(300); // looks like a PNG header

async function post(path: string, body: unknown) {
  const { app } = await import('./app.js');
  const res = await app.request(path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
  return { status: res.status, json: await res.json() };
}

describe('Claude endpoints (mock API)', () => {
  it('parse-order sends every screenshot and returns validated lines', async () => {
    reply = () => ({
      platform: 'blinkit', orderedAt: null,
      lines: [
        { rawText: 'Amul Taaza 500 ml x2', name: 'Amul Taaza Toned Milk', packSize: '500 ml', quantity: 2, pricePaise: 5800, categoryGuess: 'milk', isFood: true },
        { rawText: 'Surf Excel 1L', name: 'Surf Excel Matic', packSize: null, quantity: 1, pricePaise: null, categoryGuess: 'other', isFood: false },
      ],
    });
    const { status, json } = await post('/ai/parse-order', { images: [IMG, IMG] });
    expect(status).toBe(200);
    expect(json.lines).toHaveLength(2);
    expect(json.lines[1].packSize).toBeUndefined();
    const sent = requests.at(-1)!;
    const content = (sent.messages as { content: { type: string; source?: { media_type: string } }[] }[])[0].content;
    expect(content.filter((b) => b.type === 'image')).toHaveLength(2);
    expect(content[0].source?.media_type).toBe('image/png');
    expect(sent.fallbacks).toBe('default');
    expect((sent.output_config as { format: { type: string } }).format.type).toBe('json_schema');
    expect(String((sent._headers as Record<string, string>)['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');
  });

  it('read-date maps nulls to undefined', async () => {
    reply = () => ({ rawText: 'EXP 12/03/27', dateType: 'expiry', isoDate: '2027-03-12', bestBeforeMonths: null, packedDate: null, unsure: false });
    const { json } = await post('/ai/read-date', { image: IMG, productCategory: 'milk' });
    expect(json).toEqual({ rawText: 'EXP 12/03/27', dateType: 'expiry', isoDate: '2027-03-12', unsure: false });
  });

  it('retries once on an invalid reply, then returns 422', async () => {
    const before = requests.length;
    reply = () => ({ nonsense: true });
    const { status, json } = await post('/ai/identify-product', { image: IMG });
    expect(status).toBe(422);
    expect(json.error).toMatch(/expected format/);
    expect(requests.length - before).toBe(2);
  });

  it('suggest-meals never sends name or city and drops unknown item ids', async () => {
    reply = () => ({
      meals: [{ slot: 'lunch', title: 'Palak paneer', description: 'x', cookTimeMin: 30, servings: 2, usesItems: [{ itemId: 'a', amount: '1', fraction: 1 }, { itemId: 'ghost', amount: '1', fraction: 1 }], extraIngredients: [], equipmentNeeded: ['stove'], steps: ['Cook'] }],
    });
    const profile = { householdSize: 2, dietType: 'vegetarian', goals: [], allergies: [], dislikes: [], cuisines: [], mealsAtHome: { breakfast: true, lunch: true, dinner: true }, cookTimeWeekdayMin: 30, cookTimeWeekendMin: 45, equipment: ['stove'], name: 'Secret Name', city: 'Secret City' };
    const { json } = await post('/ai/suggest-meals', { profile, items: [{ id: 'a', name: 'Spinach', quantity: '1 bunch', daysLeft: 1 }], date: '2026-11-17', slots: ['lunch'] });
    expect(json.meals[0].usesItems.map((u: { itemId: string }) => u.itemId)).toEqual(['a']);
    const sentText = JSON.stringify(requests.at(-1)!.messages);
    expect(sentText).not.toContain('Secret Name');
    expect(sentText).not.toContain('Secret City');
    expect(sentText).toContain('a | Spinach | 1 bunch | 1');
  });
});
