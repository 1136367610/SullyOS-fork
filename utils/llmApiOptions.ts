/** Shared model options. No error-triggered retries or provider probing. */
export interface LlmApiOptions {
  baseUrl?: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  useMaxCompletionTokens?: boolean;
}

export const TOKEN_COMPAT_STORAGE_KEY = 'os_llm_token_compat';
export const TOKEN_COMPAT_EVENT = 'sully-token-compat-notice';
const notices: string[] = [];

export function copyLlmApiOptions(api?: LlmApiOptions): Pick<LlmApiOptions, 'stream' | 'temperature' | 'useMaxCompletionTokens'> {
  return {
    ...(typeof api?.stream === 'boolean' ? { stream: api.stream } : {}),
    ...(typeof api?.temperature === 'number' ? { temperature: api.temperature } : {}),
    ...(typeof api?.useMaxCompletionTokens === 'boolean' ? { useMaxCompletionTokens: api.useMaxCompletionTokens } : {}),
  };
}

export function isLikelyGpt51(model: unknown): boolean {
  return typeof model === 'string' && /gpt/i.test(model) && /(?:^|[^\d])5[.]1(?![\d]|[.]\d)/.test(model);
}

const identity = (api: LlmApiOptions) => JSON.stringify([
  (api.baseUrl || '').trim().replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, ''),
  (api.model || '').trim(),
]);

function readPreferences(): Record<string, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem(TOKEN_COMPAT_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export const readTokenCompatibilityPreferences = readPreferences;
export function restoreTokenCompatibilityPreferences(value: Record<string, unknown>): void {
  const valid = Object.fromEntries(Object.entries(value).filter(([key, mode]) => {
    if (typeof mode !== 'boolean') return false;
    try { const pair = JSON.parse(key); return Array.isArray(pair) && pair.length === 2 && pair.every(v => typeof v === 'string'); }
    catch { return false; }
  }));
  localStorage.setItem(TOKEN_COMPAT_STORAGE_KEY, JSON.stringify(valid));
}

export function tokenCompatibilityEnabled(api: LlmApiOptions): boolean {
  if (typeof api.useMaxCompletionTokens === 'boolean') return api.useMaxCompletionTokens;
  const saved = readPreferences()[identity(api)];
  return typeof saved === 'boolean' ? saved : isLikelyGpt51(api.model);
}

/** Persist before announcing success. Explicit false is never auto-enabled again. */
export function rememberTokenCompatibility(api: LlmApiOptions): boolean {
  const enabled = tokenCompatibilityEnabled(api);
  if (typeof localStorage === 'undefined' || !api.model) return enabled;
  const prefs = readPreferences();
  const key = identity(api);
  if (prefs[key] === enabled) return enabled;
  const automatic = api.useMaxCompletionTokens === undefined && enabled && isLikelyGpt51(api.model);
  // Unknown models are unchanged; do not grow a registry for unrelated requests.
  if (!automatic && api.useMaxCompletionTokens === undefined) return enabled;
  localStorage.setItem(TOKEN_COMPAT_STORAGE_KEY, JSON.stringify({ ...prefs, [key]: enabled }));
  if (automatic && typeof window !== 'undefined') {
    notices.push(api.model);
    window.dispatchEvent(new Event(TOKEN_COMPAT_EVENT));
  }
  return enabled;
}

export const takeTokenCompatibilityNotice = (): string | undefined => notices.shift();
export const peekTokenCompatibilityNotice = (): string | undefined => notices[0];

export function saveLlmApiOptions<T extends LlmApiOptions>(api: T): T & Pick<LlmApiOptions, 'useMaxCompletionTokens'> {
  const enabled = rememberTokenCompatibility(api);
  return enabled || typeof api.useMaxCompletionTokens === 'boolean'
    ? { ...api, useMaxCompletionTokens: enabled } : { ...api };
}

/** Remove internal browser transport hints before serialization to the vendor. */
export function finalizeLlmRequest(url: string, request: Record<string, any>) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('Expected a chat request object');
  const body = { ...request };
  const stream = typeof body.__sullyStream === 'boolean' ? body.__sullyStream : undefined;
  const enabled = typeof body.__sullyTokenMode === 'boolean' ? body.__sullyTokenMode
    : rememberTokenCompatibility({ baseUrl: url, model: body.model });
  delete body.__sullyStream;
  delete body.__sullyTokenMode;
  if (enabled && body.max_tokens !== undefined) {
    if (body.max_completion_tokens === undefined) body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
  }
  return { body, stream };
}

/** Caller-specific options travel with the request, not a mutable global preset. */
export function prepareLlmRequest<T extends Record<string, any>>(api: LlmApiOptions, request: T): T {
  const body: Record<string, any> = { ...request };
  const enabled = rememberTokenCompatibility(api);
  if (enabled && body.max_tokens !== undefined) {
    if (body.max_completion_tokens === undefined) body.max_completion_tokens = body.max_tokens;
    delete body.max_tokens;
  }
  if (typeof api.temperature === 'number' && 'temperature' in body) body.temperature = api.temperature;
  // Consumed by the browser fetch boundary, never forwarded to a provider.
  // Worker callers retain their own transport/parser (usually non-streaming).
  if (typeof window !== 'undefined') {
    body.__sullyTokenMode = enabled;
    if (typeof api.stream === 'boolean') body.__sullyStream = api.stream;
  }
  return body as T;
}

/** Worker task envelope: omit legacy maxTokens so the upstream builder cannot re-add it. */
export function cloudTokenOptions(api: LlmApiOptions, maxTokens?: number, extraBody?: Record<string, unknown>) {
  const enabled = rememberTokenCompatibility(api);
  const extra = { ...extraBody };
  if (enabled) {
    delete extra.max_tokens;
    if (maxTokens && extra.max_completion_tokens === undefined) extra.max_completion_tokens = maxTokens;
  }
  return {
    ...(!enabled && maxTokens ? { maxTokens } : {}),
    ...(Object.keys(extra).length ? { llmExtraBody: extra } : {}),
  };
}
