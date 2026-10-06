/**
 * Envoie le lien de connexion par e-mail via l'API Resend si `RESEND_API_KEY` est défini.
 * Sinon (environnement de développement sans compte Resend), le lien est seulement journalisé :
 * comportement annoncé dans `.env.example`.
 */
export async function sendMagicLinkEmail(params: { to: string; url: string; from: string }): Promise<void> {
  const { to, url, from } = params;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[ZugChess] Lien de connexion pour ${to} : ${url}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Votre lien de connexion ZugChess",
      html: `<p>Cliquez sur ce lien pour vous connecter à ZugChess :</p><p><a href="${url}">${url}</a></p><p>Ce lien expire dans 24 heures.</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Échec de l'envoi de l'e-mail de connexion (${response.status}) : ${body}`);
  }
}
