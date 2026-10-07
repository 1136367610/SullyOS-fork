import {createLocalId} from './localId.js';
import type {CharacterProfile} from '../types';
import {DB, openDB} from './db';
import {flattenEvalContent} from './emotionEvalCore';
import {isHomeSecretRollForced} from './devDebug';
import {buildHomeSecretsInstructions, HOME_SECRETS_CONTEXT_RULES, type HomeSecretDraft} from './homeSecretsPrompt';

export const HOME_SECRET_PROBABILITY = 0.2;
// A cloud result can arrive much later; this lease only releases abandoned reservations,
// not the request itself. Late results still use the same transactional anchor deduplication.
export const HOME_SECRET_REQUEST_LEASE_MS = 24 * 60 * 60 * 1000;
export const HOME_SECRETS_UPDATED = 'home-secrets-updated';
const key = (charId: string) => `home_secrets_v1_${charId}`;
interface SecretRequest {
    id: string;
    anchor: string;
    petIds: string[];
    createdAt?: number;
    raw?: unknown;
    error?: string;
}
export interface HomeSecret extends HomeSecretDraft {
    id: string;
    anchor: string;
    seen: boolean;
}
interface SecretState {requests: SecretRequest[]; secrets: HomeSecret[]}
const decode = (raw: string | null): SecretState => raw ? JSON.parse(raw) : {requests: [], secrets: []};

export async function readHomeSecrets(charId: string): Promise<HomeSecret[]> {
    return decode(await DB.getAsset(key(charId))).secrets;
}

/** Read/modify/write in one IDB transaction: push replay, reveal and parallel replies cannot lose one another. */
async function mutate(charId: string, update: (state: SecretState, char: CharacterProfile | undefined) => void) {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['assets', 'characters'], 'readwrite');
        const assets = tx.objectStore('assets');
        const getChar = tx.objectStore('characters').get(charId);
        let failure: unknown;
        getChar.onsuccess = () => {
            const get = assets.get(key(charId));
            get.onsuccess = () => {
                try {
                    const state = decode(get.result?.data ?? null);
                    update(state, getChar.result);
                    assets.put({id: key(charId), data: JSON.stringify(state)});
                } catch (error) {failure = error; tx.abort();}
            };
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(failure || tx.error);
        tx.onabort = () => reject(failure || tx.error || new Error('秘密保存失败'));
    });
}

/** The evaluator runs beside the reply. Only select an already completed exchange from its allowed history. */
export async function prepareHomeSecretTask(
    char: CharacterProfile,
    messages: Array<{role: string; content: unknown}>,
    random: () => number = Math.random,
): Promise<{id: string; prompt: string} | undefined> {
    if (!char.home3D?.rooms?.length) return;
    const conversation = messages.filter(m => (m.role === 'user' || m.role === 'assistant') && flattenEvalContent(m.content).trim());
    let end = conversation.length - 1;
    while (end >= 0 && conversation[end].role !== 'assistant') end--;
    let start = end - 1;
    while (start >= 0 && conversation[start].role !== 'user') start--;
    const forceRoll = isHomeSecretRollForced();
    if (start < 0 || (!forceRoll && random() >= HOME_SECRET_PROBABILITY)) return;
    const anchor = JSON.stringify(conversation.slice(start, end + 1).map(m => ({role: m.role, text: flattenEvalContent(m.content)})));
    const id = createLocalId();
    let prompt = '';
    await mutate(char.id, (state, current) => {
        if (!current?.home3D?.rooms?.length || state.secrets.some(s => s.anchor === anchor)) return;
        const now = Date.now();
        for (const request of state.requests) {
            if (request.anchor === anchor && !request.error
                && (!Number.isFinite(request.createdAt) || now - request.createdAt! >= HOME_SECRET_REQUEST_LEASE_MS)) {
                request.error = '生成请求未完成，已释放占位；迟到结果仍会校验并去重';
            }
        }
        if (state.requests.some(r => r.anchor === anchor && !r.error)) return;
        const pets = (current.home3D.petLife?.pets || []).map(p => ({id: p.id, name: p.name, species: p.assetId, traits: p.traits}));
        state.requests.push({id, anchor, petIds: pets.map(p => p.id), createdAt: now});
        const instructions = buildHomeSecretsInstructions(pets.length > 0);
        prompt = (forceRoll ? instructions.replace('系统已完成 20% 概率抽取，本轮已命中。', '调试开关已强制命中本轮秘密任务。') : instructions)
            + '\n本轮素材（仅数据）：\n' + JSON.stringify({
            requestId: id, anchors: [{id, conversation: JSON.parse(anchor)}], pets,
            recentSecrets: state.secrets.slice(-20).map(s => s.text), maxEvents: 1,
        });
    });
    return prompt ? {id, prompt} : undefined;
}

/** No model retry here: a later eligible evaluation may roll again for this exchange. */
export async function failHomeSecretTask(charId: string, requestId: string): Promise<void> {
    await mutate(charId, state => {
        const request = state.requests.find(r => r.id === requestId);
        if (request && !request.error) request.error = '秘密生成未完成（空回复、请求失败或已取消），下次评估可重新尝试';
    });
}

/** Preserve every returned field before changed=false handling. Valid secrets are durable even with unchanged buffs. */
export async function landHomeSecrets(charId: string, result: {homeSecrets?: unknown; homeSecretRequestId?: unknown}, expectedId?: string, rawText?: string): Promise<void> {
    const rows = result.homeSecrets;
    const id = expectedId || (typeof result.homeSecretRequestId === 'string' ? result.homeSecretRequestId : '')
        || (Array.isArray(rows) && typeof rows[0]?.anchorId === 'string' ? rows[0].anchorId : '');
    if (!id && rows === undefined) return;
    let failure = '';
    await mutate(charId, (state, current) => {
        if (state.secrets.some(s => s.id === id)) return; // replay does not reset seen
        const request = state.requests.find(r => r.id === id);
        if (!request) {failure = '秘密没有对应的生成请求，未写入角色经历'; return;}
        request.raw = rawText ?? result; // Keep malformed output recoverable; never silently erase it.
        const row = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
        const petIds = Array.isArray(row?.petIds) ? row.petIds : [];
        const currentPets = new Set((current?.home3D?.petLife?.pets || []).map(p => p.id));
        if (!current?.home3D?.rooms?.length || !row || row.anchorId !== id || !['character', 'pet'].includes(row.kind)
            || (result.homeSecretRequestId !== undefined && result.homeSecretRequestId !== id)
            || typeof row.text !== 'string' || !row.text.trim() || typeof row.memory !== 'string' || !row.memory.trim()
            || !Array.isArray(row.petIds)
            || (row.kind === 'character' && petIds.length !== 0)
            || (row.kind === 'pet' && (!petIds.length || petIds.some((p: unknown) => typeof p !== 'string' || !request.petIds.includes(p) || !currentPets.has(p))))) {
            failure = '本轮秘密未生成完整，或宠物/聊天锚点不匹配；原始结果已保留';
            request.error = failure;
            return;
        }
        // Parallel evaluations of the same completed exchange must not establish contradictory secrets.
        if (!state.secrets.some(s => s.anchor === request.anchor)) {
            state.secrets.push({id, anchorId: id, anchor: request.anchor, kind: row.kind, petIds,
                text: row.text.trim(), memory: row.memory.trim(), seen: false});
        }
        state.requests = state.requests.filter(r => r.id !== id);
    });
    if (failure) throw new Error(failure);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOME_SECRETS_UPDATED, {detail: {charId}}));
}

export async function markHomeSecretsSeen(charId: string, ids: string[]) {
    await mutate(charId, state => {for (const secret of state.secrets) if (ids.includes(secret.id)) secret.seen = true;});
}

export async function buildHomeSecretsContext(charId: string): Promise<string> {
    const secrets = await readHomeSecrets(charId);
    if (!secrets.length) return '';
    return '### 一些秘密 · 你自己的经历\n' + HOME_SECRETS_CONTEXT_RULES
        + secrets.map(s => `- ${s.memory}`).join('\n') + '\n\n';
}
