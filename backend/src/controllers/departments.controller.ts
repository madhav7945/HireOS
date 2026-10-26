import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(departments.map((d: any) => d.name));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

export const createDepartment = async (req: Request, res: Response) => {
  try {
    const { name, companyId } = req.body;
    
    // Auto-fetch the first company if not provided
    let cid = companyId;
    if (!cid) {
      const defaultCompany = await prisma.company.findFirst();
      cid = defaultCompany?.id;
    }

    const dept = await prisma.department.create({
      data: {
        name,
        companyId: cid,
      }
    });
    res.status(201).json(dept.name);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
};
