'use client';

import { Component, type ReactNode } from 'react';

/** Isole le module vocal : s'il plante, seul ce petit encart affiche un message. */
export default class VoiceErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error('Module vocal isolé :', e); }
  render() {
    if (this.state.failed) {
      return <p className="text-xs text-muted-foreground">Le tuteur vocal est momentanément indisponible.</p>;
    }
    return this.props.children;
  }
}
