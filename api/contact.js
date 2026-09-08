// API route: POST /api/contact — envía email vía Resend sin salir de la web
// Destinatarios: todos reciben cada envío.
const TO = [
  'hola@malo.works',
  'alfonso.megino@malo.works',
  'Juan.ruiz@malo.works',
  'juan@valmesolutions.com',
];
const FROM = 'MALO Web <hola@malo.works>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, email, message, company } = req.body || {};

  // honeypot: si viene relleno es un bot → responder OK sin enviar nada
  if (company) return res.status(200).json({ ok: true });

  // validación server-side
  if (!name || !EMAIL_RE.test(email || '') || !message) {
    return res.status(400).json({ ok: false, error: 'Invalid fields' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(500).json({ ok: false, error: 'RESEND_API_KEY not configured' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        reply_to: email,
        subject: `Nuevo mensaje de ${name} — malo.works`,
        text: [
          `Nombre: ${name}`,
          `Email: ${email}`,
          '',
          message,
        ].join('\n'),
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('Resend error', r.status, detail);
      return res.status(502).json({ ok: false, error: 'Email provider error' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact handler error', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
}
