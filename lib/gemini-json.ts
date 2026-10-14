// Appel texte à Gemini qui renvoie un objet JSON (ex. : évaluation d'une défense orale).
export async function geminiJson<T>(system: string, prompt: string): Promise<T> {
  const key = process.env.GEMINI_API_KEY || process.env.EMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY manquante');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
  const call = (withThinking: boolean) => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        ...(withThinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
      },
    }),
  });
  let res = await call(true);
  if (res.status === 400) res = await call(false);
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? []).filter((p: any) => !p?.thought).map((p: any) => p?.text ?? '').join('');
  return JSON.parse(text.replace(/^```json\s*|```$/g, '').trim()) as T;
}
