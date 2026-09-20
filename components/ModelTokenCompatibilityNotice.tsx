import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { peekTokenCompatibilityNotice, takeTokenCompatibilityNotice, TOKEN_COMPAT_EVENT } from '../utils/llmApiOptions';

export default function ModelTokenCompatibilityNotice() {
  const [model, setModel] = useState<string>();
  useEffect(() => {
    const next = () => setModel(peekTokenCompatibilityNotice());
    next();
    window.addEventListener(TOKEN_COMPAT_EVENT, next);
    return () => window.removeEventListener(TOKEN_COMPAT_EVENT, next);
  }, []);
  if (!model) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] bg-black/40 flex items-center justify-center p-6">
      <section role="alertdialog" aria-modal="true" aria-labelledby="token-compat-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl text-slate-700">
        <h2 id="token-compat-title" className="text-lg font-bold">已开启模型参数兼容</h2>
        <p className="mt-3 text-sm break-words">识别到「{model}」可能是 GPT‑5.1，已自动开启参数兼容，将 max_tokens 切换为 max_completion_tokens，避免该参数导致请求报错。</p>
        <p className="mt-2 text-sm">设置已保存。如需关闭，可前往「设置 → 模型 → 高级」，关闭“GPT‑5.1 参数兼容”并保存。</p>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">看不懂以上说明的，请直接点击“确定”。</p>
        <button autoFocus className="mt-4 w-full rounded-xl bg-slate-800 py-3 font-bold text-white" onClick={() => { takeTokenCompatibilityNotice(); setModel(peekTokenCompatibilityNotice()); }}>确定</button>
      </section>
    </div>, document.body,
  );
}
