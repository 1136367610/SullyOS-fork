// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, expect, it, vi} from 'vitest';
import HomeSecretsReveal from '../apps/room3d/HomeSecretsReveal';
const mocks = vi.hoisted(() => ({read: vi.fn(), seen: vi.fn()}));
vi.mock('./homeSecrets', () => ({readHomeSecrets: mocks.read, markHomeSecretsSeen: mocks.seen}));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const host = document.createElement('div'); document.body.append(host);
let root: ReturnType<typeof createRoot>;
afterEach(() => {act(() => root?.unmount()); vi.resetAllMocks();});

it('reveals at most two on entry, closes without dialogue, and waits until re-entry for new secrets', async () => {
    let rows = [1, 2, 3].map(id => ({id: String(id), text: `秘密${id}`, seen: false}));
    mocks.read.mockImplementation(async () => rows);
    mocks.seen.mockImplementation(async (_charId, ids) => {rows = rows.map(row => ({...row, seen: row.seen || ids.includes(row.id)}));});
    root = createRoot(host);
    const render = async (active: boolean) => {await act(async () => root.render(React.createElement(HomeSecretsReveal, {charId: 'c', active})));};
    await render(true);
    expect(host.textContent).toContain('一些秘密……');
    expect(host.textContent).toContain('秘密1');
    expect(host.textContent).toContain('秘密2');
    expect(host.textContent).not.toContain('秘密3');
    await act(async () => host.querySelector('button')!.click());
    expect(mocks.seen).toHaveBeenCalledWith('c', ['1', '2']);
    expect(host.textContent).toBe('');
    rows.push({id: '4', text: '秘密4', seen: false});
    await render(true);
    expect(host.textContent).toBe('');
    await render(false); await render(true);
    expect(host.textContent).toContain('秘密3');
    expect(host.textContent).toContain('秘密4');
});

it('does not mark anything as read until dismissal and keeps a failed dismissal retryable', async () => {
    mocks.read.mockResolvedValue([{id: '1', text: '还没读过', seen: false}]);
    mocks.seen.mockRejectedValueOnce(new Error('storage')).mockResolvedValue(undefined);
    root = createRoot(host);
    await act(async () => root.render(React.createElement(HomeSecretsReveal, {charId: 'c', active: true})));
    expect(mocks.seen).not.toHaveBeenCalled();
    await act(async () => host.querySelector('button')!.click());
    expect(host.textContent).toContain('阅读状态没能保存');
    expect(host.textContent).toContain('还没读过');
    await act(async () => host.querySelector('button')!.click());
    expect(host.textContent).toBe('');
});
