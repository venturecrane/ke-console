// Generate 8-character alphanumeric invite code
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous chars (I,O,0,1)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate UUID for IDs
export function generateId(): string {
  return crypto.randomUUID()
}

// Get invite expiry date (7 days from now)
export function getInviteExpiry(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString()
}

// Get today's date in ISO format (YYYY-MM-DD)
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Send email via Resend API
export async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kid Expenses <invites@kidexpenses.app>',
        to: [to],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend API error:', error)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: String(error) }
  }
}

// Generate invite email HTML
export function generateInviteEmailHtml(
  inviterName: string,
  familyName: string | null,
  inviteCode: string,
  inviteLink: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #18181b; font-size: 24px; margin: 0;">Kid Expenses</h1>
  </div>

  <div style="background: #f4f4f5; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #18181b; font-size: 20px; margin: 0 0 15px 0;">You've been invited!</h2>
    <p style="margin: 0 0 15px 0;">
      <strong>${inviterName}</strong> has invited you to join ${familyName ? `"${familyName}"` : 'their family'} on Kid Expenses to share and track child-related expenses together.
    </p>

    <a href="${inviteLink}" style="display: inline-block; background: #18181b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin: 15px 0;">
      Join Family
    </a>

    <p style="margin: 20px 0 10px 0; font-size: 14px; color: #71717a;">
      Or enter this code manually:
    </p>
    <div style="background: #fff; border: 1px solid #e4e4e7; border-radius: 8px; padding: 15px; text-align: center;">
      <code style="font-size: 24px; letter-spacing: 4px; color: #18181b;">${inviteCode}</code>
    </div>

    <p style="margin: 15px 0 0 0; font-size: 13px; color: #a1a1aa;">
      This invite expires in 7 days.
    </p>
  </div>

  <p style="font-size: 13px; color: #71717a; text-align: center;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
</body>
</html>
  `.trim()
}
