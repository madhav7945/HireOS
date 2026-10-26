import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export const getCompany = async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findFirst();
    if (!company) {
      return res.json({ success: true, data: { name: 'HireOS Default', id: 'default' } });
    }
    res.json({ success: true, data: company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { name, logoUrl } = req.body;
    let company = await prisma.company.findFirst();
    
    if (!company) {
      company = await prisma.company.create({
        data: { name: name || 'HireOS Default', logoUrl }
      });
    } else {
      company = await prisma.company.update({
        where: { id: company.id },
        data: { name, logoUrl }
      });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
