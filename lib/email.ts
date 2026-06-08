import nodemailer from 'nodemailer'

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('[email] SMTP not configured — emails will not be sent')
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

const FROM = process.env.SMTP_FROM || 'Futfi8 <noreply@futfi8.com>'

export type EmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transporter = getTransporter()
  if (!transporter) return

  await transporter.sendMail({
    from: FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html || payload.text.replace(/\n/g, '<br>'),
  })
}

export async function sendBatchEmail(recipients: string[], subject: string, text: string, html?: string): Promise<void> {
  for (const to of recipients) {
    await sendEmail({ to, subject, text, html })
  }
}
