import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all activity
export const getActivity = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

// Create an activity
export const createActivity = async (req: Request, res: Response) => {
  try {
    const { 
      entity_type, entity_id, action, details,
      type, icon, user, target, module, companyId 
    } = req.body;
    
    // Auto-fetch the first company if not provided
    let cid = companyId;
    if (!cid) {
      const defaultCompany = await prisma.company.findFirst();
      cid = defaultCompany?.id;
    }

    // Support both the old and new shapes
    const actType = type || (entity_type === 'candidate' ? 'candidate' : 'system');
    
    const activity = await prisma.activity.create({
      data: {
        entityType: entity_type,
        entityId: entity_id,
        action,
        details: details || {},
        type: actType,
        icon,
        user,
        target,
        module,
        companyId: cid,
      }
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
};
