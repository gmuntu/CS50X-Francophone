// Envoi d'un message texte par WhatsApp Cloud API (Meta, sans intermédiaire).
// Variables : WHATSAPP_TOKEN (jeton permanent), WHATSAPP_PHONE_NUMBER_ID.
const GRAPH = 'https://graph.facebook.com/v21.0';

export async function sendWhatsAppText(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error('WHATSAPP_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant');
  const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: to.replace(/\D/g, ''), type: 'text', text: { preview_url: false, body: text } }),
  });
  if (!res.ok) throw new Error(`Meta ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export async function markRead(messageId: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return;
  await fetch(`${GRAPH}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: messageId }),
  }).catch(() => {});
}
