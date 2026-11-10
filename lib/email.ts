/**
 * Envoi d'emails via Resend (https://resend.com) — API HTTP, aucune dépendance.
 * Variables Vercel : RESEND_API_KEY, EMAIL_FROM (ex. "SavoirIA <noreply@savoiria.online>").
 * Sans EMAIL_FROM : on envoie quand même depuis savoiria.online (domaine validé dans Resend le 2026-11-10),
 * jamais depuis l'adresse d'essai de Resend, qui n'écrit qu'au propriétaire du compte.
 * Retourne false si l'envoi n'est pas configuré ou a échoué (sans jamais exposer d'erreur au client).
 */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'SavoirIA <noreply@savoiria.online>';
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY absente : email non envoyé à', opts.to);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      console.error('[email] Échec Resend', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] Erreur réseau', e);
    return false;
  }
}
