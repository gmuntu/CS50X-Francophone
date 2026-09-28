import fr from '@/messages/fr.json';

type Messages = typeof fr;

const dictionaries: Record<string, Messages> = { fr };

export function getMessages(locale: string = 'fr'): Messages {
  return dictionaries[locale] ?? fr;
}

export function t(path: string, locale: string = 'fr'): string {
  const msgs = getMessages(locale);
  const keys = path.split('.');
  let val: any = msgs;
  for (const k of keys) {
    val = val?.[k];
    if (val === undefined) return path;
  }
  return typeof val === 'string' ? val : path;
}
