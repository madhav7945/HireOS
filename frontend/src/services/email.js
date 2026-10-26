// ============================================================
// Email service — real delivery via a Supabase Edge Function.
//
// Delivery path:
//   emailService.send() → supabase.functions.invoke('send-email')
//                       → Resend API → recipient inbox
//
// The Edge Function lives in supabase/functions/send-email/ and holds the
// RESEND_API_KEY secret server-side (never exposed to the browser).
//
// If the function isn't deployed / configured, send() degrades to an HONEST
// stub: it logs clearly, surfaces a toast, and returns { delivered: false }.
// It does NOT pretend a real email went out.
// ============================================================
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FROM = import.meta.env.VITE_EMAIL_FROM || 'HireOS <onboarding@resend.dev>'

// True only when Supabase is actually configured (not the placeholder client).
// Evaluated at call time so tests/env changes are picked up reliably.
function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL
  return !!url && url !== 'https://placeholder.supabase.co'
}

/**
 * Low-level sender. Tries the Edge Function; falls back to an honest stub.
 * @returns {Promise<{ delivered: boolean, id?: string, error?: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject) {
    return { delivered: false, error: 'Missing "to" or "subject"' }
  }

  if (!isSupabaseConfigured()) {
    return stubSend({ to, subject, reason: 'Supabase not configured' })
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html: html || text, text: text || stripHtml(html), from: FROM },
    })
    if (error) throw error
    return { delivered: true, id: data?.id }
  } catch (err) {
    // Function missing/not deployed, network error, or Resend failure.
    return stubSend({ to, subject, reason: err?.message || 'send-email function unavailable' })
  }
}

function stubSend({ to, subject, reason }) {
  // Honest stub — clearly NOT a real send.
  console.warn(
    `[EMAIL STUB — not delivered] (${reason})\n  to: ${to}\n  subject: ${subject}\n` +
      '  → Deploy the send-email Edge Function with a RESEND_API_KEY to enable real delivery.'
  )
  return Promise.resolve({ delivered: false, error: reason })
}

function stripHtml(html = '') {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Notify on the outcome so the UI feedback is truthful either way.
function notify(result, successMsg, recipientName) {
  if (result.delivered) {
    toast.success(successMsg)
  } else {
    toast(`Email to ${recipientName} not sent (delivery not configured)`, { icon: '✉️' })
  }
  return result
}

// ---- High-level, templated sends used across the app ----
export const emailService = {
  async sendApplicationReceived(candidateEmail, candidateName, jobTitle) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `We received your application for ${jobTitle}`,
      html: `<p>Hi ${candidateName},</p><p>Thanks for applying for <strong>${jobTitle}</strong>. Our AI is reviewing your profile and you'll hear from us within 48 hours.</p><p>— The HireOS Team</p>`,
    })
    return notify(result, `Confirmation email sent to ${candidateName}`, candidateName)
  },

  async sendShortlistEmail(candidateEmail, candidateName, jobTitle) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `Congratulations! Next steps for ${jobTitle}`,
      html: `<p>Hi ${candidateName},</p><p>Great news — you've been shortlisted for <strong>${jobTitle}</strong>. Our team will reach out shortly with the next steps.</p><p>— The HireOS Team</p>`,
    })
    return notify(result, `Shortlist email sent to ${candidateName}`, candidateName)
  },

  async sendInterviewScheduled(candidateEmail, candidateName, timeStr) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `Interview Scheduled — ${timeStr}`,
      html: `<p>Hi ${candidateName},</p><p>Your interview has been scheduled for <strong>${timeStr}</strong>. You'll receive a join link shortly.</p><p>— The HireOS Team</p>`,
    })
    return notify(result, `Interview invitation sent to ${candidateName}`, candidateName)
  },

  async sendInterviewReminder(candidateEmail, candidateName) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: 'Reminder: Your Interview starts in 10 minutes',
      html: `<p>Hi ${candidateName},</p><p>This is a friendly reminder that your interview starts in <strong>10 minutes</strong>. Please be ready to join.</p><p>— The HireOS Team</p>`,
    })
    return notify(result, `Reminder email sent to ${candidateName}`, candidateName)
  },

  async sendInterviewLink(candidateEmail, candidateName, link) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: 'Join your Interview Room now',
      html: `<p>Hi ${candidateName},</p><p>Your interview room is ready. <a href="${link}">Click here to join</a>.</p><p>Link: ${link}</p><p>— The HireOS Team</p>`,
    })
    return notify(result, `Meeting link emailed to ${candidateName}`, candidateName)
  },

  // Day-of reminder with the join link (fired by the pipeline's checkDueReminders).
  async sendInterviewToday(candidateEmail, candidateName, timeStr, link) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `Your interview is today${timeStr ? ` — ${timeStr}` : ''} 📅`,
      html: `<p>Hi ${candidateName},</p>
        <p>A quick reminder that your interview with the HireOS team is <strong>today${timeStr ? ` at ${timeStr}` : ''}</strong>.</p>
        <p>Find a quiet spot with a working camera & mic, then join here when you're ready:</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#6C5CE7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Join your interview</a></p>
        <p style="color:#888;font-size:13px">Link: ${link}</p>
        <p>Good luck — you've got this!<br/>— The HireOS Team</p>`,
    })
    return notify(result, `"Interview today" reminder sent to ${candidateName}`, candidateName)
  },

  // Respectful decline — kept warm so candidates leave with a good impression.
  async sendRejectionEmail(candidateEmail, candidateName, jobTitle) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `Update on your application for ${jobTitle}`,
      html: `<p>Hi ${candidateName},</p>
        <p>Thank you for taking the time to apply for <strong>${jobTitle}</strong> and for sharing your background with us.</p>
        <p>After careful review, we've decided to move forward with other candidates whose experience more closely matches what this role needs right now. This was a competitive process and the decision was not an easy one.</p>
        <p>We'd genuinely welcome a future application from you, and we'll keep your profile on file for roles that may be a stronger fit.</p>
        <p>Wishing you the very best in your search,<br/>— The HireOS Team</p>`,
    })
    return notify(result, `Update email sent to ${candidateName}`, candidateName)
  },

  // Congratulatory offer with the key details + a link to the full offer.
  async sendOfferEmail(candidateEmail, candidateName, jobTitle, { salary, startDate, offerUrl } = {}) {
    const rows = [
      ['Role', jobTitle],
      salary ? ['Compensation', salary] : null,
      startDate ? ['Proposed start', startDate] : null,
    ].filter(Boolean)
      .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#888">${k}</td><td style="padding:6px 0;font-weight:600">${v}</td></tr>`)
      .join('')
    const result = await sendEmail({
      to: candidateEmail,
      subject: `🎉 Your offer for ${jobTitle}`,
      html: `<p>Hi ${candidateName},</p>
        <p>We're thrilled to offer you the role of <strong>${jobTitle}</strong>! The whole team was impressed, and we'd love for you to join us.</p>
        <table style="border-collapse:collapse;margin:12px 0">${rows}</table>
        ${offerUrl ? `<p><a href="${offerUrl}" style="display:inline-block;padding:10px 18px;background:#00B894;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View your full offer</a></p>` : ''}
        <p>Take your time to review everything — we're here for any questions.</p>
        <p>Congratulations once again!<br/>— The HireOS Team</p>`,
    })
    return notify(result, `Offer email sent to ${candidateName}`, candidateName)
  },

  // ---- Full professional interview invitation sequence ----
  // Sends a comprehensive, branded interview invite with preparation tips.
  async sendFullInterviewInvite(candidateEmail, candidateName, jobTitle, { dateStr, timeStr, durationMin, link, companyName = 'HireOS', interviewType = 'AI Interview' } = {}) {
    const result = await sendEmail({
      to: candidateEmail,
      subject: `Interview Invitation — ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#6C5CE7,#a29bfe);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">You're Invited to Interview!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px">${jobTitle} at ${companyName}</p>
          </div>
          <div style="background:#1a1a2e;padding:24px;border:1px solid rgba(108,92,231,0.3);border-top:none;border-radius:0 0 12px 12px">
            <p style="color:#e0e0e0;margin:0 0 16px">Hi ${candidateName},</p>
            <p style="color:#ccc;margin:0 0 20px;line-height:1.6">Congratulations! After reviewing your application, we'd like to invite you for an interview for the <strong style="color:#fff">${jobTitle}</strong> position.</p>
            
            <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
              <tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">📅 Date</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${dateStr || 'To be confirmed'}</td></tr>
              <tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">🕐 Time</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${timeStr || 'To be confirmed'}</td></tr>
              <tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">⏱ Duration</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${durationMin || 30} minutes</td></tr>
              <tr><td style="padding:10px 16px;color:#999">🎯 Format</td><td style="padding:10px 16px;color:#fff;font-weight:600">${interviewType}</td></tr>
            </table>

            ${link ? `<p style="text-align:center;margin:24px 0"><a href="${link}" style="display:inline-block;padding:14px 32px;background:#6C5CE7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Join Interview Room</a></p>
            <p style="color:#888;font-size:12px;text-align:center;margin:0 0 20px">Link: ${link}</p>` : ''}

            <div style="background:rgba(108,92,231,0.08);border:1px solid rgba(108,92,231,0.2);border-radius:8px;padding:16px;margin:0 0 20px">
              <h3 style="color:#a29bfe;margin:0 0 10px;font-size:14px">📋 How to Prepare</h3>
              <ul style="color:#ccc;margin:0;padding:0 0 0 18px;line-height:1.8;font-size:13px">
                <li>Find a quiet, well-lit room with a stable internet connection</li>
                <li>Have your camera and microphone ready (you'll need both)</li>
                <li>Keep a glass of water nearby</li>
                <li>Review the job description and think about relevant experience</li>
                ${interviewType === 'AI Interview' ? '<li>You\'ll have a code editor available — no need to install anything</li>' : ''}
              </ul>
            </div>

            <p style="color:#999;font-size:13px;margin:20px 0 0;line-height:1.6">If you need to reschedule, please reply to this email as soon as possible. We look forward to meeting you!</p>
            <p style="color:#999;font-size:13px;margin:16px 0 0">Best regards,<br/><strong style="color:#ccc">The ${companyName} Hiring Team</strong></p>
          </div>
        </div>`,
    })
    return notify(result, `Interview invitation sent to ${candidateName}`, candidateName)
  },

  // Notify HR when an AI interview completes — includes score summary.
  async sendInterviewCompletionToHR(hrEmail, hrName, { candidateName, jobTitle, score, recommendation, sessionId } = {}) {
    const recLabel = { strong_hire: '🟢 Strong Hire', hire: '🟡 Hire', maybe: '🟠 Maybe', no_hire: '🔴 No Hire' }[recommendation] || recommendation
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const reportLink = sessionId ? `${origin}/interviews/${sessionId}/report` : ''
    const result = await sendEmail({
      to: hrEmail,
      subject: `AI Interview Complete — ${candidateName} for ${jobTitle} (${score || '—'}/100)`,
      html: `<p>Hi ${hrName || 'Team'},</p>
        <p><strong>${candidateName}</strong>'s AI interview for <strong>${jobTitle}</strong> has been completed.</p>
        <table style="border-collapse:collapse;margin:12px 0">
          <tr><td style="padding:6px 16px 6px 0;color:#888">Overall Score</td><td style="padding:6px 0;font-weight:700;font-size:18px;color:${score >= 85 ? '#00B894' : score >= 70 ? '#FDCB6E' : '#FF6B6B'}">${score || '—'}/100</td></tr>
          <tr><td style="padding:6px 16px 6px 0;color:#888">AI Recommendation</td><td style="padding:6px 0;font-weight:600">${recLabel}</td></tr>
        </table>
        ${reportLink ? `<p><a href="${reportLink}" style="display:inline-block;padding:10px 18px;background:#6C5CE7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">View Full Report</a></p>` : ''}
        <p style="color:#888;font-size:13px">This interview was conducted and scored by HireOS AI. Review the full transcript, proctoring data, and detailed analysis in the report above.</p>
        <p>— HireOS</p>`,
    })
    return notify(result, `Interview completion notified to ${hrName || 'HR'}`, hrName || 'HR')
  },

  // Detailed offer letter with comprehensive terms.
  async sendDetailedOfferLetter(candidateEmail, candidateName, { jobTitle, department, salary, startDate, benefits, companyName = 'HireOS', hiringManager } = {}) {
    const benefitsList = (benefits || ['Health Insurance', 'Flexible Work Hours', 'Learning Budget', 'Team Events'])
      .map(b => `<li style="padding:4px 0;color:#ccc">${b}</li>`).join('')
    const result = await sendEmail({
      to: candidateEmail,
      subject: `🎉 Official Offer Letter — ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#00B894,#55efc4);padding:32px 24px;border-radius:12px 12px 0 0;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:24px">🎉 Congratulations!</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:15px">You've been offered the ${jobTitle} position</p>
          </div>
          <div style="background:#1a1a2e;padding:24px;border:1px solid rgba(0,184,148,0.3);border-top:none;border-radius:0 0 12px 12px">
            <p style="color:#e0e0e0;margin:0 0 16px">Dear ${candidateName},</p>
            <p style="color:#ccc;line-height:1.6;margin:0 0 20px">On behalf of ${companyName}, I'm delighted to extend an official offer for the position of <strong style="color:#fff">${jobTitle}</strong>${department ? ` in our <strong style="color:#fff">${department}</strong> team` : ''}. We were impressed by your interview performance and believe you'll make an outstanding addition to our team.</p>

            <h3 style="color:#55efc4;font-size:14px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px">Offer Details</h3>
            <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
              <tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">Position</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${jobTitle}</td></tr>
              ${department ? `<tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">Department</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${department}</td></tr>` : ''}
              ${salary ? `<tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">Compensation</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${salary}</td></tr>` : ''}
              ${startDate ? `<tr><td style="padding:10px 16px;color:#999;border-bottom:1px solid rgba(255,255,255,0.06)">Start Date</td><td style="padding:10px 16px;color:#fff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06)">${startDate}</td></tr>` : ''}
              ${hiringManager ? `<tr><td style="padding:10px 16px;color:#999">Reporting To</td><td style="padding:10px 16px;color:#fff;font-weight:600">${hiringManager}</td></tr>` : ''}
            </table>

            <h3 style="color:#55efc4;font-size:14px;margin:24px 0 12px;text-transform:uppercase;letter-spacing:1px">Benefits</h3>
            <ul style="margin:0 0 20px;padding:0 0 0 18px;line-height:1.8;font-size:13px">${benefitsList}</ul>

            <p style="color:#ccc;line-height:1.6;margin:0 0 16px">Please review this offer and let us know your decision within <strong style="color:#fff">7 business days</strong>. We're happy to answer any questions you may have.</p>
            <p style="color:#999;font-size:13px;margin:20px 0 0">Warm regards,<br/><strong style="color:#ccc">${hiringManager || 'The Hiring Team'}</strong><br/>${companyName}</p>
          </div>
        </div>`,
    })
    return notify(result, `Offer letter sent to ${candidateName}`, candidateName)
  },
}
