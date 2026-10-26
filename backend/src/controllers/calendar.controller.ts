import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCalendarEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { date: 'asc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
};

export const createCalendarEvent = async (req: Request, res: Response) => {
  try {
    const { title, candidate, role, date, time, type, interviewer, companyId } = req.body;
    
    // Auto-fetch the first company if not provided
    let cid = companyId;
    if (!cid) {
      const defaultCompany = await prisma.company.findFirst();
      cid = defaultCompany?.id;
    }

    const ev = await prisma.calendarEvent.create({
      data: {
        title,
        candidate,
        role,
        date,
        time,
        type,
        interviewer,
        companyId: cid,
      }
    });
    res.status(201).json(ev);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
};
