// Mise en forme des réponses pour SMS : un SMS coûte 1 « segment » de 160 caractères
// tant qu'on reste dans l'alphabet GSM. Un seul caractère hors alphabet (ê, ç, œ, emoji...)
// fait passer TOUT le message en Unicode : 70 caractères par segment, donc 2 à 3 fois plus cher.

// Caractères de l'alphabet GSM 03.38 (y compris é è à ù ì ò É Ç, mais PAS ê â î ô û ç ë ï).
const GSM =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXT = '^{}\\[~]|€'; // comptent pour 2 caractères
const GSM_SET = new Set([...GSM, ...GSM_EXT]);

const REPLACE: Record<string, string> = {
  â: 'a', ê: 'e', î: 'i', ô: 'o', û: 'u', ë: 'e', ï: 'i', ÿ: 'y', ç: 'c',
  Â: 'A', Ê: 'E', Î: 'I', Ô: 'O', Û: 'U', Ë: 'E', Ï: 'I', È: 'E', À: 'A', Ù: 'U',
  œ: 'oe', Œ: 'OE', '’': "'", '‘': "'", '«': '"', '»': '"', '“': '"', '”': '"',
  '–': '-', '—': '-', '…': '...', ' ': ' ', ' ': ' ', '•': '-', '`': "'",
};

/** Convertit un texte pour qu'il tienne dans l'alphabet GSM (SMS moins chers). */
export function toGsm(text: string): string {
  let out = '';
  for (const ch of text) {
    if (GSM_SET.has(ch)) out += ch;
    else if (REPLACE[ch] !== undefined) out += REPLACE[ch];
    else {
      const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
      out += [...base].every((c) => GSM_SET.has(c)) ? base : ''; // emoji et symboles : supprimés
    }
  }
  return out;
}

/** Nombre de segments SMS facturés pour un texte GSM. */
export function smsSegments(gsmText: string): number {
  const len = [...gsmText].reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

/** Retire la mise en forme Markdown, inutile dans un SMS ou un WhatsApp brut. */
export function plain(text: string): string {
  return text
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Coupe proprement (fin de phrase) pour rester sous une longueur maximale. */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '), cut.lastIndexOf('\n'));
  return (end > max * 0.5 ? cut.slice(0, end + 1) : cut) + '...';
}
