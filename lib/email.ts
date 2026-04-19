import { Resend } from 'resend'

type SendEmailInput = {
  to: string
  subject: string
  html: string
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, skipped: true as const }

  const resend = new Resend(apiKey)
  const from = process.env.RESEND_FROM_EMAIL || 'GolfDraw <onboarding@resend.dev>'

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })

    if (error) return { ok: false, error }
    return { ok: true as const }
  } catch (error) {
    return { ok: false, error }
  }
}
