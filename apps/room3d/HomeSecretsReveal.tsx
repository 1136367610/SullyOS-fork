import React, {useEffect, useState} from 'react';
import Modal from '../../components/os/Modal';
import {markHomeSecretsSeen, readHomeSecrets, type HomeSecret} from '../../utils/homeSecrets';

/** Take a snapshot on entry only. A newly generated secret waits for the next visit. */
export default function HomeSecretsReveal({charId, active, ready = true}: {charId: string; active: boolean; ready?: boolean}) {
    const [secrets, setSecrets] = useState<HomeSecret[]>([]);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setSecrets([]); setError('');
        if (active) readHomeSecrets(charId).then(rows => {
            if (!cancelled) setSecrets(rows.filter(row => !row.seen).slice(0, 2));
        }).catch(() => {if (!cancelled) setError('秘密暂时没能读取，重新进入小屋可重试。');});
        return () => {cancelled = true;};
    }, [charId, active]);
    const close = async () => {
        if (saving) return;
        setSaving(true);
        try {await markHomeSecretsSeen(charId, secrets.map(s => s.id)); setSecrets([]); setError('');}
        catch {setError('阅读状态没能保存，请再试一次。');}
        finally {setSaving(false);}
    };
    return <Modal isOpen={active && ready && (!!secrets.length || !!error)} title="一些秘密……" onClose={() => {
        if (secrets.length) void close(); else setError('');
    }}>
        {secrets.map(secret => <p key={secret.id} className="mb-4 whitespace-pre-wrap text-sm leading-7 last:mb-0">{secret.text}</p>)}
        {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    </Modal>;
}
