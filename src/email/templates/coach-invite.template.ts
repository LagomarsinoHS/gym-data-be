import type { SendEmailInput } from '../types/send-email.type';

const COPY = {
  en: {
    subject: (coachName: string) =>
      `${coachName} invited you to train together`,
    heading: (coachName: string) =>
      `${coachName} invited you to be their athlete`,
    body: (email: string) =>
      `Sign up with this email (${email}), then accept the invitation in the app. Valid for 24 hours.`,
    cta: 'Open the app',
    footer: 'If you were not expecting this, you can ignore the email.',
  },
  es: {
    subject: (coachName: string) => `${coachName} te invitó a entrenar juntos`,
    heading: (coachName: string) => `${coachName} te invita a ser su alumno`,
    body: (email: string) =>
      `Registrate con este email (${email}) y después aceptá la invitación en la app. Válida 24h.`,
    cta: 'Abrir la app',
    footer: 'Si no esperabas este correo, podés ignorarlo.',
  },
} as const;

export function coachInviteEmail(input: {
  to: string;
  coachName: string;
  athleteEmail: string;
  lang?: 'es' | 'en';
  appUrl?: string;
}): SendEmailInput {
  const lang = input.lang === 'en' ? 'en' : 'es';
  const copy = COPY[lang];
  const heading = copy.heading(input.coachName);
  const body = copy.body(input.athleteEmail);
  const cta = input.appUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">${copy.cta}</a></p>`
    : '';

  return {
    to: input.to,
    subject: copy.subject(input.coachName),
    text: [heading, body, input.appUrl ?? '', copy.footer]
      .filter(Boolean)
      .join('\n\n'),
    html: `<!doctype html>
<html lang="${lang}">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;color:#111">
  <div style="max-width:480px;margin:0 auto;background:#fff;padding:24px;border-radius:12px">
    <p style="margin:0 0 12px;font-size:18px;font-weight:600">${escapeHtml(heading)}</p>
    <p style="margin:0;line-height:1.5">${escapeHtml(body)}</p>
    ${cta}
    <p style="margin:24px 0 0;font-size:12px;color:#71717a">${escapeHtml(copy.footer)}</p>
  </div>
</body>
</html>`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
