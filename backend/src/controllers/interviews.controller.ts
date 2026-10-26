import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { resendDispatcher } from '../services/email/resendDispatcher.js';
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.VITE_AI_API_KEY });
const AI_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

export const getInterviewSession = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    const interview = await prisma.interview.findUnique({
      where: { magicToken: token },
      include: {
        candidate: {
          include: { job: true }
        }
      }
    });

    if (!interview) {
      return res.status(404).json({ success: false, error: 'Invalid or expired session token' });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createInterview = async (req: Request, res: Response) => {
  try {
    const { 
      candidateId, isAiInterview = true, scheduledAt, meetingLink, 
      candidate, email, role, jobId, type, status, duration, magicToken 
    } = req.body;

    let targetCandidateId = candidateId;
    if (!targetCandidateId && email) {
      const c = await prisma.candidate.findFirst({ where: { email } });
      if (c) targetCandidateId = c.id;
    }
    if (!targetCandidateId) {
      const c = await prisma.candidate.findFirst();
      targetCandidateId = c?.id || 'cand-001';
    }

    const token = magicToken || `int_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const interview = await prisma.interview.create({
      data: {
        candidateId: targetCandidateId,
        isAiInterview: type === 'HR Interview' || type === 'Technical Panel' ? false : (isAiInterview ?? true),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        magicToken: token,
        meetingLink: meetingLink || (type === 'HR Interview' || type === 'Technical Panel' ? `http://localhost:5173/meet/${token}` : null),
        status: status || 'PENDING'
      },
      include: {
        candidate: { include: { job: true } }
      }
    });

    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const scheduleHrInterview = async (req: Request, res: Response) => {
  try {
    const { candidateId, scheduledAt, meetingLink } = req.body;

    const interview = await prisma.interview.create({
      data: {
        candidateId,
        isAiInterview: false,
        scheduledAt: new Date(scheduledAt),
        meetingLink,
        status: 'PENDING'
      }
    });

    // Send HR Schedule Email
    const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
    if (candidate) {
        await resendDispatcher.sendEmail({
            to: candidate.email,
            subject: 'Your HR Interview has been scheduled!',
            template: 'HR_INTERVIEW_SCHEDULED',
            payload: {
                time: scheduledAt,
                link: meetingLink
            }
        });
    }

    res.status(201).json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getInterviews = async (req: Request, res: Response) => {
  try {
    const interviews = await prisma.interview.findMany({
      include: { candidate: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: interviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getInterviewById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { candidate: true }
    });
    if (!interview) return res.status(404).json({ success: false, error: 'Interview not found' });
    res.json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateInterview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const interview = await prisma.interview.update({
      where: { id },
      data
    });
    res.json({ success: true, data: interview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const startInterviewSession = async (req: Request, res: Response) => {
  try {
    const { interviewId, role, candidateName, resumeText } = req.body;
    
    let resolvedRole = role || 'Senior Software Engineer';
    let resolvedName = candidateName || 'Candidate';
    let resolvedResume = resumeText || '';

    if (interviewId && interviewId !== 'demo') {
      const itv = await prisma.interview.findFirst({
        where: { OR: [{ id: interviewId }, { magicToken: interviewId }] },
        include: { candidate: { include: { job: true } } }
      });
      if (itv) {
        resolvedRole = itv.candidate?.job?.title || itv.candidate?.role || resolvedRole;
        resolvedName = itv.candidate ? `${itv.candidate.firstName} ${itv.candidate.lastName}`.trim() : resolvedName;
        resolvedResume = itv.candidate?.resumeText || resolvedResume;
      }
    }

    const systemPrompt = `
# ROLE & PERSONA
You are Sarah, an elite, highly experienced, and EXTREMELY STRICT female Senior Engineering Manager at a top-tier tech company. You are conducting a live, verbal technical interview with ${resolvedName} for the role of ${resolvedRole}.
You have a very high bar, expect excellence, and will ruthlessly evaluate answers.

Candidate Resume Context: ${(resolvedResume || "").substring(0, 1500)}

# INSTRUCTIONS
1. Introduce yourself briefly and professionally as Sarah, Senior Engineering Manager. DO NOT introduce yourself as an AI.
2. Outline the agenda: Phase 1 is a background & experience deep-dive, Phase 2 is coding, and Phase 3 is Q&A.
3. Immediately start Phase 1 by asking EXACTLY ONE clear, targeted question based on their technical background. Do not ask multi-part questions.
4. CONVERSATIONAL PACING: Sound like a real human. Use ellipses (...) occasionally to create thoughtful pauses.
5. ABSOLUTELY NO STAGE DIRECTIONS. Output only the exact words you will speak out loud. No parentheses, no asterisks.
6. Keep your introduction natural and concise (3-4 sentences maximum).
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: AI_MODEL,
      temperature: 0.6,
      max_tokens: 180,
    });

    let greeting = chatCompletion.choices[0]?.message?.content || `Hello ${resolvedName}, I'm Sarah, Senior Principal Engineer. We'll start with a quick walk through your background, then dive into coding. To begin, tell me about your most complex architecture project.`;
    greeting = greeting.replace(/\([^)]*\)/g, '').replace(/\*([^*]+)\*/g, '').trim();

    res.json({ success: true, greeting });
  } catch (error: any) {
    console.error('startInterviewSession error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to start interview' });
  }
};

export const chatInterviewStream = async (req: Request, res: Response) => {
  const { 
    interviewId, candidateMessage, phase = 1, code = '', 
    language = 'javascript', warningCount = 0, role = 'Senior Software Engineer', 
    candidateName = 'Candidate', transcript = [] 
  } = req.body;

  let resolvedRole = role;
  let resolvedName = candidateName;

  if (interviewId && interviewId !== 'demo') {
    const itv = await prisma.interview.findFirst({
      where: { OR: [{ id: interviewId }, { magicToken: interviewId }] },
      include: { candidate: { include: { job: true } } }
    });
    if (itv) {
      resolvedRole = itv.candidate?.job?.title || itv.candidate?.role || resolvedRole;
      resolvedName = itv.candidate ? `${itv.candidate.firstName} ${itv.candidate.lastName}`.trim() : resolvedName;
    }
  }

  const systemPrompt = `
# ROLE & PERSONA
You are Sarah, an elite, highly experienced, and EXTREMELY STRICT female Senior Engineering Manager conducting a live technical interview for ${resolvedRole} with candidate ${resolvedName}.
You are speaking to the candidate over a live audio feed. Act like a tough, direct, seasoned human interviewer. You expect excellence.
You are NOT their friend or tutor. You are strictly evaluating them.

# INTERVIEW STATE
- Current Phase: Phase ${phase} (1=Intro/Experience Deep-Dive, 2=Coding/Sandbox, 3=Deep Q&A)
- Current Code in Editor (${language}):
${code || '// No code written yet.'}
- System Integrity Flags: ${warningCount || 0}

# BEHAVIORAL RULES - STRICT!
1. CONVERSATIONAL PACING: Sound like a real human. Use short follow-ups (2-3 sentences). Never monologue or send walls of text.
2. NEVER reveal you are an AI.
3. SINGLE QUESTION RULE: End every response with EXACTLY ONE clear, direct question. Never ask multi-part questions.
4. ABSOLUTELY NO STAGE DIRECTIONS: Output plain spoken words only. No asterisks, no parentheses.
5. CALL TERMINATION: When the interview is finished, append exactly "[END_CALL]" to your final message.

${phase === 1 ? `- PHASE 1: Deep dive into their background, state architecture, and decisions. DO NOT ask them to write code yet.` : ''}
${phase === 2 ? `- PHASE 2: Live coding phase. Ask them to implement clean solutions in the editor. Focus on algorithmic efficiency and edge cases.` : ''}
${phase >= 3 ? `- PHASE 3: Q&A phase. Ask them: "Do you have any questions for me about the team or our technical architecture?". Respond concisely.` : ''}

Respond naturally as Sarah the interviewer to the candidate's latest utterance.
`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const history: Array<{ role: 'user' | 'assistant'; content: string }> = Array.isArray(transcript) 
      ? transcript.slice(-8).map((m: any) => ({
          role: m.sender === 'candidate' ? 'user' : 'assistant',
          content: String(m.text || m.content || '')
        })) 
      : [];

    if (candidateMessage && (!history.length || history[history.length - 1].content !== candidateMessage)) {
      history.push({ role: 'user', content: String(candidateMessage) });
    }

    const stream = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history
      ],
      model: AI_MODEL,
      temperature: 0.65,
      max_tokens: 180,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('chatInterviewStream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`);
    res.end();
  }
};
