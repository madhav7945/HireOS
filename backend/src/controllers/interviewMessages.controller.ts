import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getInterviewMessages = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const messages = await prisma.interviewMessage.findMany({
      where: { interviewId },
      orderBy: { timestamp: 'asc' }
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interview messages' });
  }
};

export const createInterviewMessage = async (req: Request, res: Response) => {
  try {
    const { interviewId } = req.params;
    const { sender, content, timestamp } = req.body;

    const message = await prisma.interviewMessage.create({
      data: {
        interviewId,
        sender,
        content,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      }
    });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create interview message' });
  }
};
