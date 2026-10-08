'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {
  Mic, Send, Play, Square, Download, NotebookPen, ScrollText,
  ChevronDown, ChevronUp, Volume2, Landmark, Lightbulb, Code2, Loader2,
} from 'lucide-react';
import type { CourseModuleConfig } from '@/config/course-modules';
import InteractiveQuizModal from '@/components/interactive-quiz-modal';

type DayType = 'MONDAY' | 'WEDNESDAY' | 'FRIDAY';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  moduleConfig: CourseModuleConfig;
  audioScripts: any[];
  quizzes: any[];
}

const DAY_LABELS: Record<DayType, string> = {
  MONDAY: 'Lundi',
  WEDNESDAY: 'Mercredi',
  FRIDAY: 'Vendredi',
};

// Nettoie le texte pour une lecture vocale limpide (retire le Markdown brut).
function sanitizeForVoice(text: string): string {
  return (text ?? '')
    .replace(/```[\s\S]*?```/g, ' (bloc de code) ')
    .replace(/`[^`]*`/g, ' code ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Découpe un long texte en segments (≤ maxLen) aux frontières de phrases,
// pour respecter la limite d'entrée de Google Cloud TTS.
function chunkText(text: string, maxLen = 1800, firstLen = 220): string[] {
  const clean = (text ?? '').trim();
  if (!clean) return [];
  // 1er segment court (1 à 2 phrases) : la voix démarre presque tout de suite.
  const sent = clean.match(/[^.!?…]+[.!?…]+/g);
  if (firstLen && sent && clean.length > firstLen) {
    let head = '';
    for (const s of sent) { if (head && (head + s).length > firstLen) break; head += s; }
    if (head && head.length < clean.length) return [head.trim(), ...chunkText(clean.slice(head.length), maxLen, 0)];
  }
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.match(/[^.!?…]+[.!?…]+|\S+$/g) || [clean];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export default function CourseAssistant({ moduleConfig, audioScripts, quizzes }: Props) {
  const moduleId = moduleConfig?.id ?? 0;

  const [selectedDay, setSelectedDay] = useState<DayType>('MONDAY');
  const [showDialogue, setShowDialogue] = useState(false);
  const [isSpeakingDay, setIsSpeakingDay] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [isDayLoading, setIsDayLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dayAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechCancelRef = useRef(false);
  const speechGenRef = useRef(0);
  // Lecteur unique, « débloqué » lors d'un clic (les navigateurs bloquent le son lancé plus tard sans clic).
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const getPlayer = () => {
    if (!playerRef.current && typeof window !== 'undefined') playerRef.current = new Audio();
    return playerRef.current!;
  };
  // iPhone : on joue la voix via Web Audio, « débloqué » pendant le clic ; ensuite
  // Safari laisse Socrate parler même quand la réponse arrive plusieurs secondes plus tard.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const unlockAudio = () => {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        if (!audioCtxRef.current) audioCtxRef.current = new AC();
        const ctx = audioCtxRef.current!;
        ctx.resume?.().catch(() => {});
        const silent = ctx.createBufferSource();
        silent.buffer = ctx.createBuffer(1, 1, 22050);
        silent.connect(ctx.destination);
        silent.start(0);
      }
    } catch {}
    try {
      const p = getPlayer();
      p.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
      p.play().catch(() => {});
      // iPhone : la voix du navigateur (secours) doit aussi être « débloquée » pendant le clic.
      if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    } catch {}
  };

  const currentScript = (audioScripts ?? []).find((a: any) => a?.dayOfWeek === selectedDay);
  const currentQuiz = (quizzes ?? []).find((q: any) => q?.dayOfWeek === selectedDay) ?? null;

  const welcome = `Bonjour ! Je suis Socrate, ton tuteur pour : **${moduleConfig?.title ?? 'ce cours'}**. Quelle notion souhaites-tu explorer ou approfondir aujourd'hui ?`;

  useEffect(() => {
    setMessages([{ role: 'assistant', content: welcome }]);
    setSelectedDay('MONDAY');
    setShowDialogue(false);
  }, [moduleId, welcome]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const stopAllSpeech = useCallback(() => {
    speechCancelRef.current = true;
    speechGenRef.current++;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current = null;
    }
    if (dayAudioRef.current) {
      dayAudioRef.current.pause();
      dayAudioRef.current = null;
    }
    setIsSpeakingDay(false);
    setSpeakingIdx(null);
    setIsDayLoading(false);
  }, []);

  useEffect(() => () => stopAllSpeech(), [stopAllSpeech]);

  // Fallback : synthèse vocale du navigateur (utilisée si Google Cloud TTS indisponible).
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('La synthèse vocale n\u2019est pas supportée par votre navigateur.');
      onEnd?.();
      return;
    }
    const clean = sanitizeForVoice(text);
    if (!clean) { onEnd?.(); return; }
    const utter = new SpeechSynthesisUtterance(clean.slice(0, 4500));
    utter.lang = 'fr-FR';
    utter.rate = 1;
    utter.onend = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  }, []);

  // Synthèse d'un segment via Google Cloud TTS (voix neuronale). Renvoie le base64 MP3, ou null.
  const synthesizeChunk = useCallback(async (text: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.fallback || !data?.audioContent) return null;
      return data.audioContent as string;
    } catch {
      return null;
    }
  }, []);

  const playBase64 = useCallback(async (b64: string) => {
    const ctx = audioCtxRef.current;
    if (ctx) {
      if (ctx.state !== 'running') await ctx.resume().catch(() => {});
      if (ctx.state === 'running') {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const buffer: AudioBuffer = await new Promise((res, rej) => ctx.decodeAudioData(bytes.buffer, res, rej));
        await new Promise<void>((resolve) => {
          try { sourceRef.current?.stop(); } catch {}
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.onended = () => { if (sourceRef.current === src) sourceRef.current = null; resolve(); };
          sourceRef.current = src;
          src.start(0);
        });
        return;
      }
    }
    return playWithElement(b64);
  }, []);

  const playWithElement = (b64: string) => new Promise<void>((resolve, reject) => {
    const audio = getPlayer();
    audio.pause();
    currentAudioRef.current = audio;
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error('Erreur de lecture audio'));
    audio.src = 'data:audio/mpeg;base64,' + b64;
    audio.play().catch(reject);
  });

  // Lecture intelligente : voix neuronale Google (par segments) avec repli navigateur.
  const speakSmart = useCallback(async (fullText: string, onEnd: () => void) => {
    const clean = sanitizeForVoice(fullText);
    if (!clean) { onEnd(); return; }
    // Une seule voix à la fois : on coupe toute lecture en cours.
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null; }
    if (dayAudioRef.current) { dayAudioRef.current.pause(); dayAudioRef.current = null; }
    const gen = ++speechGenRef.current;
    const stale = () => gen !== speechGenRef.current;
    speechCancelRef.current = false;
    const chunks = chunkText(clean);
    if (chunks.length === 0) { onEnd(); return; }

    // On teste le 1er segment via Google : s'il échoue, repli complet navigateur.
    const first = await synthesizeChunk(chunks[0]);
    if (stale()) return;
    setIsDayLoading(false);

    if (first == null) {
      speak(clean, onEnd);
      return;
    }

    try {
      // Le segment suivant est préparé pendant la lecture du précédent (pas de blanc).
      let next = chunks.length > 1 ? synthesizeChunk(chunks[1]) : null;
      await playBase64(first);
      for (let i = 1; i < chunks.length; i++) {
        if (stale()) return;
        const b64 = await next;
        next = i + 1 < chunks.length ? synthesizeChunk(chunks[i + 1]) : null;
        if (stale()) return;
        if (b64 == null) { await new Promise<void>((r) => speak(chunks.slice(i).join(' '), r)); break; }
        await playBase64(b64);
      }
    } catch {
      // Son bloqué ou erreur : on bascule sur la voix du navigateur plutôt que le silence.
      if (!stale()) { await new Promise<void>((r) => speak(clean, r)); }
    }
    if (!stale()) onEnd();
  }, [synthesizeChunk, playBase64, speak]);

  // Synthèse d'une réplique avec la voix du personnage (Socrate / l'étudiante).
  const synthesizeLine = useCallback(async (text: string, speaker: 'Socrate' | 'Étudiant'): Promise<string | null> => {
    try {
      const res = await fetch('/api/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.audioContent ?? null;
    } catch {
      return null;
    }
  }, []);

  // Podcast à deux voix : chaque réplique est lue par son personnage ;
  // la suivante est préparée pendant la lecture de la précédente (pas de silence).
  const speakDialogue = useCallback(async (lines: { speaker: 'Socrate' | 'Étudiant'; text: string }[], onEnd: () => void) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    const gen = ++speechGenRef.current;
    const stale = () => gen !== speechGenRef.current;
    const clean = lines
      .map((l) => ({ speaker: l.speaker, text: sanitizeForVoice(l.text) }))
      .filter((l) => l.text);
    if (clean.length === 0) { onEnd(); return; }

    let next = synthesizeLine(clean[0].text, clean[0].speaker);
    try {
      for (let i = 0; i < clean.length; i++) {
        const b64 = await next;
        if (stale()) return;
        if (i === 0) setIsDayLoading(false);
        if (i + 1 < clean.length) next = synthesizeLine(clean[i + 1].text, clean[i + 1].speaker);
        if (b64 == null) {
          // Voix indisponible : on lit le reste avec la voix du navigateur plutôt que le silence.
          await new Promise<void>((r) => speak(clean.slice(i).map((l) => l.text).join(' '), r));
          break;
        }
        await playBase64(b64);
      }
    } catch {
      if (!stale()) await new Promise<void>((r) => speak(clean.map((l) => l.text).join(' '), r));
    }
    if (!stale()) onEnd();
  }, [synthesizeLine, playBase64, speak]);

  // Écouter la session du jour (voix neuronale Google, repli navigateur).
  const playDayAudio = async () => {
    if (isSpeakingDay || isDayLoading) {
      stopAllSpeech();
      return;
    }
    stopAllSpeech();
    unlockAudio();
    speechCancelRef.current = false;
    // Dialogue disponible : podcast à deux voix africaines (Socrate + l'étudiante).
    const lines = Array.isArray(currentScript?.dialogue)
      ? currentScript.dialogue
          .filter((d: any) => d?.text)
          .map((d: any) => ({ speaker: d?.speaker === 'Socrate' ? 'Socrate' as const : 'Étudiant' as const, text: String(d.text) }))
      : [];
    if (lines.length >= 2) {
      setIsDayLoading(true);
      setIsSpeakingDay(true);
      await speakDialogue(lines, () => { setIsSpeakingDay(false); setIsDayLoading(false); });
      return;
    }
    // Sinon : fichier MP3 pré-généré.
    if (currentScript?.audioUrl) {
      const audio = new Audio(currentScript.audioUrl);
      dayAudioRef.current = audio;
      audio.onended = () => setIsSpeakingDay(false);
      setIsSpeakingDay(true);
      audio.play().catch(() => setIsSpeakingDay(false));
      return;
    }
    const text = currentScript?.cleanTtsText
      || (Array.isArray(currentScript?.dialogue) ? currentScript.dialogue.map((d: any) => d?.text).filter(Boolean).join(' ') : '')
      || currentScript?.pedagogicalObjective;
    if (!text) {
      alert("L'audio socratique de ce jour n'a pas encore été généré. Un administrateur peut le générer via « Régénérer avec l'IA ».");
      return;
    }
    setIsDayLoading(true);
    setIsSpeakingDay(true);
    await speakSmart(text, () => { setIsSpeakingDay(false); setIsDayLoading(false); });
  };

  const handleDownloadAudio = () => {
    if (!currentScript?.audioUrl) {
      alert('Le fichier MP3 n\u2019est pas encore disponible pour cette session. Utilisez « Écouter avec Socrate » pour la lecture vocale.');
      return;
    }
    const a = document.createElement('a');
    a.href = currentScript.audioUrl;
    a.download = `Socrate_Semaine${moduleId}_${selectedDay}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const toggleMessageSpeech = async (text: string, idx: number) => {
    if (speakingIdx === idx) {
      stopAllSpeech();
      return;
    }
    stopAllSpeech();
    unlockAudio();
    speechCancelRef.current = false;
    setSpeakingIdx(idx);
    await speakSmart(text, () => setSpeakingIdx(null));
  };

  // Enregistrement micro (repli quand le navigateur n'a pas de reconnaissance vocale intégrée)
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Convertit l'enregistrement (webm sur Android/Chrome, mp4 sur iPhone) en PCM 16 kHz mono,
  // un format que Google comprend quel que soit le téléphone.
  const toPcm16 = async (blob: Blob): Promise<string> => {
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    try {
      const buf = await blob.arrayBuffer();
      // Forme « rappel » : compatible avec les anciens Safari.
      const decoded: AudioBuffer = await new Promise((res, rej) => ctx.decodeAudioData(buf, res, rej));
      const rate = 16000;
      const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
      const src = off.createBufferSource();
      src.buffer = decoded;
      src.connect(off.destination);
      src.start();
      const out = (await off.startRendering()).getChannelData(0);
      const bytes = new Uint8Array(out.length * 2);
      const view = new DataView(bytes.buffer);
      for (let i = 0; i < out.length; i++) view.setInt16(i * 2, Math.max(-1, Math.min(1, out[i])) * 0x7fff, true);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(binary);
    } finally {
      ctx.close?.();
    }
  };

  const transcribeWithGoogle = async (blob: Blob) => {
    try {
      const audio = await toPcm16(blob);
      const res = await fetch('/api/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio, format: 'pcm16' }),
      });
      const data = await res.json();
      if (data?.transcript) sendMessage(data.transcript, true);
      else alert("Je n'ai pas compris. Réessaie en parlant un peu plus près du micro.");
    } catch {
      alert('La reconnaissance vocale a échoué. Tu peux taper ta question.');
    }
  };

  const startRecordingFallback = async () => {
    if (recorderRef.current) {
      recorderRef.current.stop(); // deuxième clic : on arrête et on envoie
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/aac'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorderRef.current = null;
        setIsListening(false);
        transcribeWithGoogle(new Blob(chunks, { type: rec.mimeType }));
      };
      recorderRef.current = rec;
      setIsListening(true);
      rec.start();
      setTimeout(() => recorderRef.current === rec && rec.stop(), 15000); // 15 s maximum
    } catch {
      setIsListening(false);
      alert("Impossible d'accéder au micro. Autorise le micro dans ton navigateur.");
    }
  };

  const startListening = () => {
    stopAllSpeech();
    unlockAudio();
    const SR: any = typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
    // iPhone / iPad : la reconnaissance intégrée s'arrête souvent sans rien dire.
    // On utilise directement l'enregistrement + Google (1er appui : parler, 2e appui : envoyer).
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!SR || isIOS) {
      startRecordingFallback();
      return;
    }
    try {
      const recognition = new SR();
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = e?.results?.[0]?.[0]?.transcript ?? '';
        setIsListening(false);
        // Conversation vocale : la question part directement, Socrate répondra à voix haute
        if (transcript.trim()) sendMessage(transcript, true);
      };
      let gotResult = false;
      recognition.onresult = ((orig) => (e: any) => { gotResult = true; orig(e); })(recognition.onresult);
      // iPhone (surtout l'application installée) : la reconnaissance intégrée échoue souvent.
      // Dans ce cas on passe à l'enregistrement + reconnaissance Google.
      recognition.onerror = (e: any) => {
        setIsListening(false);
        if (!gotResult && !['no-speech', 'aborted'].includes(e?.error)) startRecordingFallback();
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const sendMessage = async (text: string, fromVoice = false) => {
    const trimmed = text?.trim?.();
    if (!trimmed || loading) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, moduleId }),
      });
      if (!res?.ok || !res?.body) throw new Error('Erreur du serveur');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages([...newMessages, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk?.split?.('\n') ?? [];
        for (const line of lines) {
          if (line?.startsWith?.('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const delta =
                parsed?.choices?.[0]?.delta?.content ??
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
                parsed?.text ??
                '';
              assistantContent += delta;
              setMessages((prev) => {
                const updated = [...(prev ?? [])];
                if (updated.length > 0) updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            } catch {}
          }
        }
      }
      if (fromVoice && assistantContent.trim()) {
        const idx = newMessages.length;
        stopAllSpeech();
        setSpeakingIdx(idx);
        speakSmart(assistantContent, () => setSpeakingIdx(null));
      }
    } catch (err) {
      console.error('Tutor error:', err);
      setMessages((prev) => [
        ...(prev ?? []),
        { role: 'assistant', content: "⚠️ Socrate rencontre une difficulté temporaire de connexion à son moteur d'IA. Veuillez réessayer dans quelques instants." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const dialogueLines: any[] = Array.isArray(currentScript?.dialogue) ? currentScript.dialogue : [];

  return (
    <div className="space-y-4">
      {/* --- PANNEAU AUDIOS SOCRATIQUES --- */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-soft-sm space-y-3.5">
        <div className="flex justify-between items-center">
          <span className="text-xs sm:text-sm font-black text-[#7c3aed] flex items-center gap-1.5">
            <ScrollText className="w-4 h-4" /> Audios Socratiques (3x / sem)
          </span>
          {currentScript && (
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full border border-primary/20">
              Prêt pour écoute
            </span>
          )}
        </div>

        {/* Sélecteur des 3 jours */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/70 rounded-xl border border-border/70">
          {(['MONDAY', 'WEDNESDAY', 'FRIDAY'] as DayType[]).map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => { stopAllSpeech(); setSelectedDay(day); setShowDialogue(false); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isSelected
                    ? 'bg-card text-foreground shadow-sm shadow-black/5 border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
                }`}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>

        {/* Carte descriptive de la session */}
        <div className="bg-muted/30 p-3.5 rounded-xl border border-border/70 space-y-2.5 text-xs">
          <div className="flex justify-between items-start gap-2">
            <h5 className="font-bold text-foreground leading-snug">
              {currentScript?.title || `Session du ${DAY_LABELS[selectedDay]}`}
            </h5>
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono shrink-0">~5 min</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed italic">
            {currentScript?.pedagogicalObjective || 'Objectif : développer une compréhension profonde par le questionnement socratique.'}
          </p>

          {/* Boutons d'action */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={playDayAudio}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                isSpeakingDay ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20'
              }`}
            >
              {isDayLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSpeakingDay ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isDayLoading ? 'Préparation…' : isSpeakingDay ? 'Arrêter la voix' : 'Écouter avec Socrate'}
            </button>
            {currentScript?.audioUrl && (
              <button
                type="button"
                onClick={handleDownloadAudio}
                title="Télécharger l'audio en MP3"
                className="px-3 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-foreground transition flex items-center gap-1 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> MP3
              </button>
            )}
            {currentQuiz && (
              <button
                type="button"
                onClick={() => setQuizModalOpen(true)}
                title="Passer le quiz du jour"
                className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-500/30 transition-all flex items-center gap-1 shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" /> Quiz
              </button>
            )}
          </div>

          {/* Accordion dialogue */}
          {dialogueLines.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDialogue(!showDialogue)}
                className="text-[11px] text-primary hover:text-primary/80 flex items-center gap-1 font-semibold"
              >
                {showDialogue ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showDialogue ? 'Masquer le script textuel' : 'Afficher le dialogue écrit'}
              </button>
              {showDialogue && (
                <div className="mt-2 p-3 bg-card rounded-xl max-h-56 overflow-y-auto space-y-2 text-[11px] border border-border/80">
                  {dialogueLines.map((line: any, li: number) => (
                    <div key={li} className="space-y-0.5">
                      <span className={`font-extrabold ${line?.speaker === 'Socrate' ? 'text-primary' : 'text-amber-600'}`}>
                        {line?.speaker === 'Socrate' ? 'Socrate' : 'Étudiante'} :
                      </span>
                      <p className="text-foreground/80 pl-2 leading-relaxed">{line?.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notebook */}
        {moduleConfig?.notebookUrl ? (
          <a
            href={moduleConfig.notebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => stopAllSpeech()}
            className="w-full text-xs font-bold bg-card hover:bg-primary hover:text-primary-foreground text-foreground py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-border/80 hover:border-primary shadow-soft-sm"
          >
            <NotebookPen className="w-4 h-4 text-primary" /> Ouvrir le Notebook de la Semaine
          </a>
        ) : (
          <button
            type="button"
            onClick={() => { stopAllSpeech(); alert('Le notebook de cette semaine sera bientôt disponible.'); }}
            className="w-full text-xs font-bold bg-card hover:bg-muted text-muted-foreground py-2.5 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-border/80 opacity-80"
          >
            <NotebookPen className="w-4 h-4" /> Ouvrir le Notebook de la Semaine
          </button>
        )}

        {/* Questions rapides */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/70">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-extrabold">Questions rapides</span>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              stopAllSpeech();
              sendMessage("Pourquoi ce concept a-t-il été inventé ? Quelle est l'intuition profonde ?");
            }}
            className="text-xs bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground font-medium py-2 px-3 rounded-xl transition-all text-left flex items-center gap-2 border border-border/70 disabled:opacity-50"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="truncate">L&apos;intuition derrière ce concept</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              stopAllSpeech();
              sendMessage('Peux-tu me donner un exemple concret de code commenté pas à pas ?');
            }}
            className="text-xs bg-muted/40 hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground font-medium py-2 px-3 rounded-xl transition-all text-left flex items-center gap-2 border border-border/70 disabled:opacity-50"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="truncate">Un exemple de code pas à pas</span>
          </button>
        </div>
      </div>

      {/* --- DISCUSSION AVEC SOCRATE --- */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-soft-sm flex flex-col space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground">Discussion avec Socrate</span>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En ligne
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-3.5 max-h-[420px] custom-scrollbar pr-1">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-2 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {m.role === 'user' ? 'U' : <Landmark className="w-3 h-3" />}
                </div>
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted/40 text-foreground border border-border/70 rounded-bl-sm'
                }`}>
                  <div className="prose-cs50-chat">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            <div className="my-2 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
                              <SyntaxHighlighter language={match[1]} style={oneLight as any} customStyle={{ margin: 0, fontSize: '0.72rem' }}>
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-primary/10 px-1.5 py-0.5 rounded text-primary font-mono text-[11px] font-semibold" {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              {m.role === 'assistant' && m.content && (
                <button
                  type="button"
                  onClick={() => toggleMessageSpeech(m.content, idx)}
                  className="mt-1 ml-8 text-[10px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 transition"
                >
                  {speakingIdx === idx ? <Square className="w-3 h-3 text-rose-500" /> : <Volume2 className="w-3 h-3" />}
                  {speakingIdx === idx ? 'Arrêter la voix' : 'Écouter la réponse'}
                </button>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-8">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Socrate réfléchit...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center pt-3 border-t border-border/70">
          <button
            type="button"
            onClick={startListening}
            title={isListening ? "J\u2019écoute… (clique pour arrêter)" : "Parler à Socrate"}
            className={`p-2.5 rounded-xl border transition shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pose ta question à Socrate..."
            className="flex-1 min-w-0 bg-background border border-border/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition shadow-inner"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-1 shadow-sm shadow-primary/20"
          >
            <Send className="w-3.5 h-3.5" /> Envoyer
          </button>
        </form>
      </div>

      <InteractiveQuizModal
        quiz={currentQuiz}
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
      />
    </div>
  );
}
