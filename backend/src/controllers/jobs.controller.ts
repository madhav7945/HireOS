import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const { 
      title, department, description, 
      weightTechnical, weightExperience, weightScreening, weightEducation, weightCommunication, 
      minExperienceYears, requireWorkAuth, 
      companyId 
    } = req.body;
    
    // In a real app we get companyId from the JWT context req.user.companyId
    const targetCompanyId = companyId || "demo-company-id";

    // Ensure company exists first for foreign key constraint
    let company = await prisma.company.findUnique({ where: { id: targetCompanyId } });
    if (!company) {
       company = await prisma.company.create({
           data: {
               id: targetCompanyId,
               name: "Acme Corp Demo"
           }
       });
    }

    const job = await prisma.job.create({
      data: {
        title,
        department,
        description,
        weightTechnical: parseInt(weightTechnical) || 20,
        weightExperience: parseInt(weightExperience) || 20,
        weightScreening: parseInt(weightScreening) || 20,
        weightEducation: parseInt(weightEducation) || 20,
        weightCommunication: parseInt(weightCommunication) || 20,
        minExperienceYears: parseInt(minExperienceYears) || 0,
        requireWorkAuth: requireWorkAuth === true || requireWorkAuth === 'true',
        companyId: company.id
      }
    });
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { id },
      include: { candidates: true }
    });
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const job = await prisma.job.update({
      where: { id },
      data
    });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.job.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
