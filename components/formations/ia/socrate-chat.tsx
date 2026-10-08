'use client';

import { useRef, useState } from 'react';
import { Send } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

// Tuteur Socrate écrit pour les formations SavoirIA (le contexte vient du cours de la semaine).
export default function SocrateChat({ course, week, starter }: { course: string; week: number; starter: string }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: starter }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, course, week }),
      });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const p = JSON.parse(line.slice(6));
            acc += p?.choices?.[0]?.delta?.content ?? p?.candidates?.[0]?.content?.parts?.[0]?.text ?? p?.text ?? '';
            setMessages([...next, { role: 'assistant', content: acc }]);
          } catch {}
        }
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: "⚠️ Socrate n'est pas joignable pour le moment. Réessayez dans un instant." }]);
    } finally {
      setLoading(false);
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="font-bold text-foreground mb-3">💬 Poser une question à Socrate</p>
      <div className="max-h-80 overflow-y-auto space-y-2 mb-3">
        {messages.map((m, i) => (
          <p key={i} className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white ml-8' : 'bg-muted mr-8'}`}>
            {m.content || '…'}
          </p>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Votre question…"
          className="flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer"
          className="rounded-xl bg-blue-600 px-3 text-white disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}
