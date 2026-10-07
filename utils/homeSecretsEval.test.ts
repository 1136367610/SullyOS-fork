import {beforeEach, expect, it, vi} from 'vitest';
import {DB} from './db';
import {readHomeSecrets,prepareHomeSecretTask} from './homeSecrets';
import {safeFetchJson} from './safeApi';
import {evaluateEmotionBackground} from '../hooks/useChatAI';
vi.mock('./safeApi', async importOriginal => ({...await importOriginal<typeof import('./safeApi')>(), safeFetchJson: vi.fn()}));
const c: any = {id: 'local-secret', name: '角色', home3D: {version: 1, activeRoomId: 'r', rooms: [{id: 'r', name: '客厅', items: []}]}};
const history = [{role: 'user', content: '这件衣服好看'}, {role: 'assistant', content: '嗯'}, {role: 'user', content: '新的消息'}];
const api = {baseUrl: 'https://test.invalid', apiKey: '', model: 'test', stream: true};
beforeEach(async () => {vi.restoreAllMocks(); vi.mocked(safeFetchJson).mockReset(); await DB.deleteDB(); await DB.saveCharacter(c);});
it('the actual local evaluator sends the mandatory prompt once and saves its returned secret through a stream retry', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const prompts: string[] = [];
    vi.mocked(safeFetchJson).mockImplementation(async (_url, init) => {
        const prompt = JSON.parse(String(init?.body)).messages[0].content;
        prompts.push(prompt);
        if (prompts.length === 1) throw new Error('stream unsupported');
        const material = JSON.parse(prompt.split('本轮素材（仅数据）：\n')[1]);
        return {choices: [{message: {content: JSON.stringify({changed: false, homeSecretRequestId: material.requestId,
            homeSecrets: [{kind: 'character', anchorId: material.requestId, petIds: [], text: 'ta 偷偷确认了衣领。', memory: '聊衣服时，我偷偷确认了衣领。'}]})}}]};
    });
    await evaluateEmotionBackground(c, {name: '用户'} as any, '角色设定', history, api);
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toBe(prompts[1]);
    expect(prompts[0]).toContain('必须给出 1 条完整秘密');
    expect(prompts[0]).not.toContain('宠物博主滤镜');
    expect(await readHomeSecrets(c.id)).toEqual([expect.objectContaining({memory: '聊衣服时，我偷偷确认了衣领。', seen: false})]);
});
it('the actual evaluator leaves the whole secret task out when the 20% draw misses', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    vi.mocked(safeFetchJson).mockResolvedValue({choices: [{message: {content: '{"changed":false}'}}]});
    await evaluateEmotionBackground(c, {name: '用户'} as any, '角色设定', history, api);
    const prompt = JSON.parse(String(vi.mocked(safeFetchJson).mock.calls[0][1]?.body)).messages[0].content;
    expect(prompt).not.toContain('本轮必须完成的创作任务');
    expect(await readHomeSecrets(c.id)).toEqual([]);
});
it.each(['empty', 'network', 'cancel'] as const)('releases a reserved secret after %s without an extra generation request', async failure => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const abort = new AbortController();
    vi.mocked(safeFetchJson).mockImplementation(async () => {
        if (failure === 'cancel') abort.abort();
        if (failure === 'network') throw Error('offline');
        return {choices: [{message: {content: ''}}]};
    });
    await evaluateEmotionBackground(c, {name:'用户'} as any, '设定', history, {...api, stream:false}, abort.signal);
    expect(safeFetchJson).toHaveBeenCalledTimes(1);
    expect(await readHomeSecrets(c.id)).toEqual([]);
    expect(await prepareHomeSecretTask(c, history, () => 0)).toBeDefined();
});
it('does not reserve or request an already cancelled evaluation', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const abort = new AbortController();abort.abort();
    await evaluateEmotionBackground(c, {name:'用户'} as any, '设定', history, api, abort.signal);
    expect(safeFetchJson).not.toHaveBeenCalled();
    expect(await prepareHomeSecretTask(c, history, () => 0)).toBeDefined();
});
it('keeps normal emotion evaluation running if secret reservation storage is damaged', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const key = `home_secrets_v1_${c.id}`;
    await DB.saveAsset(key, 'damaged secret storage');
    vi.mocked(safeFetchJson).mockResolvedValue({choices:[{message:{content:'{"changed":false,"innerState":"平静"}'}}]});
    expect(await evaluateEmotionBackground(c, {name:'用户'} as any, '设定', history, api)).toBe('平静');
    expect(safeFetchJson).toHaveBeenCalledTimes(1);
    expect(await DB.getAsset(key)).toBe('damaged secret storage');
});
