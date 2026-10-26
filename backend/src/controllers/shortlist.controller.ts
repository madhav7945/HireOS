import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { semanticScorer } from '../services/ai/semanticScorer.js';
import { resendDispatcher } from '../services/email/resendDispatcher.js';
import crypto from 'crypto';

export const evaluateShortlist = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    // 1. Fetch job to get weighting
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    // 2. Fetch candidates that are in APPLIED stage (haven't been evaluated yet)
    const candidates = await prisma.candidate.findMany({
      where: { jobId, stage: 'APPLIED', knockoutReason: null }
    });

    if (candidates.length === 0) {
        return res.json({ success: true, message: 'No new candidates to evaluate' });
    }

    const evaluatedCandidates = [];

    // 3. Evaluate each candidate
    for (const candidate of candidates) {
        // Mock PDF parsing by passing the stored parsedText
        const textToEvaluate = candidate.parsedText || "Sample generic resume content...";
        
        // Call Groq Llama-3.3 (Mocked)
        const scores = await semanticScorer.evaluateCandidate(textToEvaluate);

        // Calculate weighted composite
        const compositeScore = (
            (scores.technical * job.weightTechnical) +
            (scores.experience * job.weightExperience) +
            (scores.screening * job.weightScreening) +
            (scores.education * job.weightEducation) +
            (scores.communication * job.weightCommunication)
        ) / 100;

        // Save score
        await prisma.candidateScore.create({
            data: {
                candidateId: candidate.id,
                technical: scores.technical,
                experience: scores.experience,
                screening: scores.screening,
                education: scores.education,
                communication: scores.communication,
                compositeScore
            }
        });

        // Update candidate stage to SHORTLISTED
        await prisma.candidate.update({
            where: { id: candidate.id },
            data: { stage: 'SHORTLISTED' }
        });

        // Generate magic token for AI interview
        const magicToken = crypto.randomBytes(32).toString('hex');

        // Create AI Interview Session
        await prisma.interview.create({
            data: {
                candidateId: candidate.id,
                isAiInterview: true,
                magicToken
            }
        });

        // Send Email Invitation
        await resendDispatcher.sendEmail({
            to: candidate.email,
            subject: `Invitation for AI Technical Interview: ${job.title}`,
            template: 'AI_INTERVIEW_INVITE',
            payload: {
                candidateName: candidate.firstName,
                jobTitle: job.title,
                companyName: 'HireOS Default Company',
                inviteLink: `http://localhost:5173/interview/${magicToken}`
            }
        });

        evaluatedCandidates.push(candidate.id);
    }

    res.json({ success: true, message: `Successfully evaluated ${evaluatedCandidates.length} candidates` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
