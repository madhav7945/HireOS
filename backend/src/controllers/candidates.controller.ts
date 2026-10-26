import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getAllCandidates = async (req: Request, res: Response) => {
  try {
    const candidates = await prisma.candidate.findMany({
      include: {
        job: true,
        score: true,
        interviews: true,
        offer: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, jobId, parsedText } = req.body;

    // Check if the candidate already applied
    const existing = await prisma.candidate.findFirst({
        where: { email, jobId }
    });

    if (existing) {
        return res.status(400).json({ success: false, error: 'Already applied for this job' });
    }

    const candidate = await prisma.candidate.create({
      data: {
        firstName,
        lastName,
        email,
        jobId,
        parsedText: parsedText || "Demo resume text...",
        stage: 'APPLIED',
      }
    });
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCandidatesByJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const candidates = await prisma.candidate.findMany({
      where: { jobId },
      include: {
          score: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: candidates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: { score: true }
    });
    if (!candidate) return res.status(404).json({ success: false, error: 'Candidate not found' });
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const candidate = await prisma.candidate.update({
      where: { id },
      data
    });
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.candidate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
