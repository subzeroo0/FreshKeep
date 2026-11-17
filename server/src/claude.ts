import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

// All Claude calls go through here: JSON-only structured output validated against a Zod schema,
// one retry with the validation error included, 20-second timeout, refusal fallback on.

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
let client: Anthropic | null = null;

export const hasKey = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export class AiError extends Error {
  constructor(message: string, public status: 422 | 502 | 503 = 422) {
    super(message);
  }
}

type ImageMedia = 'image/jpeg' | 'image/png' | 'image/webp';

export function imageBlock(b64: string): Anthropic.Beta.BetaImageBlockParam {
  const data = b64.replace(/^data:image\/\w+;base64,/, '');
  const media: ImageMedia = data.startsWith('iVBOR') ? 'image/png' : data.startsWith('UklGR') ? 'image/webp' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: media, data } };
}

export async function askJson<S extends z.ZodType>(opts: {
  task: string;
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  if (!hasKey()) throw new AiError('Server has no Claude API key configured', 503);
  const started = Date.now();
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = attempt === 0
      ? opts.content
      : [...opts.content, { type: 'text' as const, text: `Your previous reply failed validation: ${lastError}. Reply again with JSON matching the schema exactly.` }];
    try {
      const res = await getClient().beta.messages.parse({
        model: MODEL,
        max_tokens: opts.maxTokens ?? 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: betaZodOutputFormat(opts.schema) },
        system: opts.system,
        messages: [{ role: 'user', content }],
      });
      // Cost tracking: request time and token use (no images or user data are logged or stored).
      console.log(JSON.stringify({ task: opts.task, ms: Date.now() - started, model: res.model, in: res.usage.input_tokens, out: res.usage.output_tokens, stop: res.stop_reason }));
      if (res.stop_reason === 'refusal') throw new AiError('The model declined this request', 422);
      if (res.parsed_output == null) {
        lastError = `stop_reason ${res.stop_reason}`;
        continue;
      }
      return res.parsed_output;
    } catch (e) {
      if (e instanceof AiError) throw e;
      if (e instanceof Anthropic.BadRequestError) {
        lastError = e.message;
        throw new AiError(`Could not process the image or request: ${e.message}`, 422);
      }
      if (e instanceof Anthropic.AuthenticationError) throw new AiError('Server API key is invalid', 503);
      if (e instanceof Anthropic.RateLimitError) throw new AiError('AI is busy — try again in a minute', 503);
      if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AiError('AI took too long (20 s timeout)', 502);
      if (e instanceof Anthropic.APIError) throw new AiError(`AI error ${e.status ?? ''}: ${e.message}`, 502);
      // JSON / schema validation failure from the parse helper → retry once with the error.
      lastError = e instanceof Error ? e.message.slice(0, 400) : String(e);
    }
  }
  throw new AiError(`The AI reply did not match the expected format (${lastError})`, 422);
}
