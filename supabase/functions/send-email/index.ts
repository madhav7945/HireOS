// ============================================================
// Supabase Edge Function: send-email
// Sends transactional email via Resend. Keeps RESEND_API_KEY server-side.
//
// Deploy:
//   supabase functions deploy send-email
//   supabase secrets set RESEND_API_KEY=re_xxx
//   (optional) supabase secrets set EMAIL_FROM="HireOS <noreply@yourdomain.com>"
//
// The frontend calls it via supabase.functions.invoke('send-email', { body }).
// ============================================================
// @ts-nocheck — runs in Deno (Supabase Edge runtime), not the app's Node/Vite build.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const DEFAULT_FROM = Deno.env.get('EMAIL_FROM') || 'HireOS <onboarding@resend.dev>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY not configured on the server' }, 500)
  }

  let payload: { to?: string; subject?: string; html?: string; text?: string; from?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { to, subject, html, text, from } = payload
  if (!to || !subject || (!html && !text)) {
    return json({ error: 'Missing required fields: to, subject, and html or text' }, 400)
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return json({ error: data?.message || 'Resend send failed', detail: data }, res.status)
    }
    return json({ id: data?.id, delivered: true })
  } catch (err) {
    return json({ error: (err as Error)?.message || 'Unexpected error' }, 500)
  }
})
