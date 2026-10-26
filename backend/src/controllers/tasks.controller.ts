import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all tasks
export const getTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Create a task
export const createTask = async (req: Request, res: Response) => {
  try {
    const { text, title, dueDate, companyId } = req.body;
    
    // Auto-fetch the first company if not provided
    let cid = companyId;
    if (!cid) {
      const defaultCompany = await prisma.company.findFirst();
      cid = defaultCompany?.id;
    }

    const task = await prisma.task.create({
      data: {
        text: text || title || 'Untitled task',
        dueDate: dueDate ? new Date(dueDate) : null,
        companyId: cid,
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Update a task
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { text, title, dueDate, done } = req.body;
    
    const taskText = text || title;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(taskText !== undefined && { text: taskText }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(done !== undefined && { done }),
      }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Delete a task
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
