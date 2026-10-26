import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getDashboardMetrics = async (req: Request, res: Response) => {
  try {
    // In a real app, we'd aggregate actual counts from Prisma
    // For now, let's return some realistic dummy data to populate the dashboard

    const metrics = {
      activeJobs: await prisma.job.count(),
      totalCandidates: await prisma.candidate.count(),
      interviewsScheduled: await prisma.interview.count({ where: { status: 'PENDING' } }),
      offersExtended: await prisma.offer.count()
    };

    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
