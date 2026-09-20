import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLlmRequestBody } from '@rei-standard/amsg-shared';
import { cloudTokenOptions, copyLlmApiOptions, finalizeLlmRequest, isLikelyGpt51, prepareLlmRequest, rememberTokenCompatibility, restoreTokenCompatibilityPreferences, saveLlmApiOptions, takeTokenCompatibilityNotice, tokenCompatibilityEnabled, TOKEN_COMPAT_EVENT, TOKEN_COMPAT_STORAGE_KEY } from './llmApiOptions';
import { configFromPreset } from './apiPresetSwitch';
import { normalizeApiConfig } from './apiConfigNormalize';
import { visionApiConfigFromPreset } from './visionApi';

beforeEach(() => { localStorage.removeItem(TOKEN_COMPAT_STORAGE_KEY); while (takeTokenCompatibilityNotice()) {} });
afterEach(() => vi.unstubAllGlobals());

describe('GPT-5.1 explicit compatibility', () => {
  it.each(['gpt-5.1', 'GPT-商家把名字放在这里-5.1', '5.1 / GPT 商家', 'openai/gpt-5.1-2025-11-13'])('recognizes %s', model => {
    expect(isLikelyGpt51(model)).toBe(true);
  });
  it.each(['gpt-5.10', 'gpt-15.1', 'claude-5.1', 'gpt-4.1', 'gemini', 'gpt-5.1.2'])('leaves %s alone', model => {
    expect(isLikelyGpt51(model)).toBe(false);
  });
  it('persists automatic detection and a manual opt-out across config reloads', () => {
    const api = { baseUrl: 'https://one/v1', apiKey: 'secret', model: 'gpt-店铺-5.1' };
    const saved = saveLlmApiOptions(api);
    expect(saved.useMaxCompletionTokens).toBe(true);
    expect(tokenCompatibilityEnabled(JSON.parse(JSON.stringify(saved)))).toBe(true);
    saveLlmApiOptions({ ...api, useMaxCompletionTokens: false });
    expect(rememberTokenCompatibility(api)).toBe(false);
    expect(tokenCompatibilityEnabled({ ...api, baseUrl: 'https://other/v1' })).toBe(true);
    expect(localStorage.getItem(TOKEN_COMPAT_STORAGE_KEY)).not.toContain('secret');
  });
  it('changes only the token field, preserving existing new-field limits and input', () => {
    const api = { model: 'gpt-5.1' };
    const original = { model: api.model, messages: [], max_tokens: 8000, stream: true };
    expect(prepareLlmRequest(api, original)).toEqual({ model: api.model, messages: [], max_completion_tokens: 8000, stream: true });
    expect(original.max_tokens).toBe(8000);
    expect(prepareLlmRequest(api, { max_tokens: 8000, max_completion_tokens: 12000 })).toEqual({ max_completion_tokens: 12000 });
    expect(prepareLlmRequest({ ...api, useMaxCompletionTokens: false }, original)).toEqual(original);
    expect(prepareLlmRequest({ model: 'claude' }, { max_tokens: 8000 })).toEqual({ max_tokens: 8000 });
  });
  it('does not report a saved preference when storage fails', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => saveLlmApiOptions({ model: 'gpt-5.1' })).toThrow('quota');
    spy.mockRestore();
  });
  it('copies preset options through normalization and vision selection, including false and zero', () => {
    const config = normalizeApiConfig({ baseUrl: ' https://x/v1/ ', apiKey: 'k', model: 'gpt-5.1', stream: false, temperature: 0, useMaxCompletionTokens: false });
    const preset = { id: 'a', name: 'A', config };
    const expected = { stream: false, temperature: 0, useMaxCompletionTokens: false };
    expect(copyLlmApiOptions(configFromPreset(preset))).toEqual(expected);
    expect(copyLlmApiOptions(visionApiConfigFromPreset(preset))).toEqual(expected);
    expect(copyLlmApiOptions(normalizeApiConfig({ ...config, visionApi: visionApiConfigFromPreset(preset) }).visionApi)).toEqual(expected);
    const copy = configFromPreset(preset); preset.config.stream = true;
    expect(copy.stream).toBe(false);
  });
  it('announces automatic detection only once after persistence', () => {
    const events = new EventTarget(); vi.stubGlobal('window', events);
    const listener = vi.fn(() => expect(localStorage.getItem(TOKEN_COMPAT_STORAGE_KEY)).toContain('true'));
    events.addEventListener(TOKEN_COMPAT_EVENT, listener);
    const api = { baseUrl: 'https://x/v1', model: 'gpt-店铺-5.1' };
    rememberTokenCompatibility(api); rememberTokenCompatibility(api);
    expect(listener).toHaveBeenCalledTimes(1);
    saveLlmApiOptions({ ...api, useMaxCompletionTokens: false });
    rememberTokenCompatibility(api);
    expect(listener).toHaveBeenCalledTimes(1);
  });
  it('strips internal hints and retains independent false stream and zero temperature', () => {
    vi.stubGlobal('window', new EventTarget());
    const api = { baseUrl: 'https://x/v1', model: 'gpt-5.1', stream: false, temperature: 0, useMaxCompletionTokens: false };
    const body = prepareLlmRequest(api, { model: api.model, messages: [], temperature: 0.9, max_tokens: 8000 });
    const wire = finalizeLlmRequest(`${api.baseUrl}/chat/completions`, body);
    expect(wire.stream).toBe(false);
    expect(wire.body).toEqual({ model: api.model, messages: [], temperature: 0, max_tokens: 8000 });
    expect(JSON.stringify(wire.body)).not.toContain('__sully');
  });
  it('produces a Worker envelope that the real upstream builder sends without max_tokens', () => {
    const options = cloudTokenOptions({ model: 'gpt-5.1' }, 8000, { reasoning_effort: 'low' });
    const body = buildLlmRequestBody({ primaryModel: 'gpt-5.1', messages: [{ role: 'user', content: 'hello' }], ...options });
    expect(body).toMatchObject({ max_completion_tokens: 8000, reasoning_effort: 'low' });
    expect(body).not.toHaveProperty('max_tokens');
    expect(cloudTokenOptions({ model: 'gpt-5.1', useMaxCompletionTokens: false }, 8000)).toEqual({ maxTokens: 8000 });
  });
  it('restores validated preferences from backups', () => {
    const key = JSON.stringify(['https://x/v1', 'gpt-5.1']);
    restoreTokenCompatibilityPreferences({ [key]: false, invalid: true, '["x","y"]': 'false' });
    expect(tokenCompatibilityEnabled({ baseUrl: 'https://x/v1', model: 'gpt-5.1' })).toBe(false);
    expect(JSON.parse(localStorage.getItem(TOKEN_COMPAT_STORAGE_KEY)!)).toEqual({ [key]: false });
  });
});
