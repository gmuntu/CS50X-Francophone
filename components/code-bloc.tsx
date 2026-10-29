'use client';

// Coloration du code, version légère : seulement les langages des cours (au lieu de plusieurs centaines).
import { PrismLight } from 'react-syntax-highlighter';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql';
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import oneLight from 'react-syntax-highlighter/dist/esm/styles/prism/one-light';

const LANGUES: Record<string, any> = { c, python, javascript, sql, markup, css, bash, json };
for (const [nom, def] of Object.entries(LANGUES)) PrismLight.registerLanguage(nom, def);
const ALIAS: Record<string, string> = { py: 'python', js: 'javascript', html: 'markup', sh: 'bash', shell: 'bash', h: 'c' };

export default function CodeBloc({ language, children, customStyle }: { language?: string; children: React.ReactNode; customStyle?: React.CSSProperties }) {
  const l = (language || '').toLowerCase();
  return (
    <PrismLight language={ALIAS[l] ?? l} style={oneLight as any} customStyle={customStyle}>
      {String(children)}
    </PrismLight>
  );
}
