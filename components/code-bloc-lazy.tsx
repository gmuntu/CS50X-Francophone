'use client';

import dynamic from 'next/dynamic';

// Chargée seulement quand un bloc de code apparaît : la page s'ouvre plus vite en 3G.
const CodeBloc = dynamic(() => import('./code-bloc'), {
  ssr: false,
  loading: () => <pre className="p-3 text-xs text-muted-foreground">…</pre>,
});

export default function CodeBlocLazy(props: { language?: string; children: React.ReactNode; customStyle?: React.CSSProperties; style?: unknown }) {
  return (
    <CodeBloc language={props.language} customStyle={props.customStyle}>
      {props.children}
    </CodeBloc>
  );
}
