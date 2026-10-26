import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { OfferSignerService } from '../services/workflow/offerSigner.js';

export class OffersController {
  
  // POST /api/v1/offers and POST /api/v1/offers/generate
  static async generateOffer(req: Request, res: Response) {
    try {
      const { candidateId, candidate: candidateName, email, baseSalary, salary, equity, bonus, status } = req.body;

      let targetCandidateId = candidateId;
      if (!targetCandidateId && email) {
        const c = await prisma.candidate.findFirst({ where: { email } });
        if (c) targetCandidateId = c.id;
      }
      if (!targetCandidateId) {
        const c = await prisma.candidate.findFirst();
        targetCandidateId = c?.id || 'cand-001';
      }

      // 1. Verify candidate exists
      const candidate = await prisma.candidate.findUnique({
        where: { id: targetCandidateId }
      });

      if (!candidate) {
        return res.status(404).json({ error: 'Candidate not found.' });
      }

      const numSalary = typeof baseSalary === 'number' 
        ? baseSalary 
        : (parseFloat(String(salary || baseSalary || '150000').replace(/[^0-9.]/g, '')) || 150000);

      // 2. Generate secure magic token
      const magicToken = req.body.magicToken || OfferSignerService.generateOfferToken();

      // 3. Create or update the Offer record
      const offer = await prisma.offer.upsert({
        where: { candidateId: targetCandidateId },
        update: {
          baseSalary: numSalary,
          equity: equity ? parseFloat(String(equity).replace(/[^0-9.]/g, '')) : null,
          bonus: bonus ? parseFloat(String(bonus).replace(/[^0-9.]/g, '')) : null,
          magicToken,
          status: status || 'PENDING',
          signatureHash: null,
          signedAt: null
        },
        create: {
          candidateId: targetCandidateId,
          baseSalary: numSalary,
          equity: equity ? parseFloat(String(equity).replace(/[^0-9.]/g, '')) : null,
          bonus: bonus ? parseFloat(String(bonus).replace(/[^0-9.]/g, '')) : null,
          magicToken,
          status: status || 'PENDING'
        },
        include: {
          candidate: { include: { job: true } }
        }
      });

      res.status(201).json({
        success: true,
        data: offer,
        message: 'Offer generated successfully',
        offerLink: `http://localhost:5173/offer-portal/${magicToken}`,
        offer
      });
    } catch (error) {
      console.error('[OffersController.generateOffer]', error);
      res.status(500).json({ error: 'Failed to generate offer' });
    }
  }

  // GET /api/v1/offers/:token
  static async getOfferByToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      let offer = await prisma.offer.findUnique({
        where: { magicToken: token },
        include: {
          candidate: {
            include: { job: true } // Include job details for the UI
          }
        }
      });

      if (!offer) {
        offer = await prisma.offer.findUnique({
          where: { id: token },
          include: {
            candidate: {
              include: { job: true }
            }
          }
        });
      }

      if (!offer) {
        return res.status(404).json({ error: 'Offer not found or expired.' });
      }

      res.json(offer);
    } catch (error) {
      console.error('[OffersController.getOfferByToken]', error);
      res.status(500).json({ error: 'Failed to fetch offer' });
    }
  }

  // POST /api/v1/offers/sign
  static async signOffer(req: Request, res: Response) {
    try {
      const { magicToken, signatureData } = req.body;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      const offer = await prisma.offer.findUnique({
        where: { magicToken }
      });

      if (!offer || offer.status === 'SIGNED') {
        return res.status(400).json({ error: 'Invalid or already signed offer.' });
      }

      // Generate the SHA-256 Audit Hash
      const signatureHash = OfferSignerService.generateSignatureHash(signatureData, ip);

      // Save to database and update Candidate to HIRED
      const updatedOffer = await prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: 'SIGNED',
          signatureHash,
          signedAt: new Date(),
          candidate: {
            update: {
              stage: 'HIRED'
            }
          }
        }
      });

      res.json({
        message: 'Offer signed successfully. Welcome to the team!',
        auditReceipt: signatureHash
      });
    } catch (error) {
      console.error('[OffersController.signOffer]', error);
      res.status(500).json({ error: 'Failed to sign offer' });
    }
  }

  static async getOffers(req: Request, res: Response) {
    try {
      const offers = await prisma.offer.findMany({
        include: { candidate: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: offers });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async updateOffer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const offer = await prisma.offer.update({
        where: { id },
        data
      });
      res.json({ success: true, data: offer });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
