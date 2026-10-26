import { Router } from 'express';
import { evaluateShortlist } from '../../controllers/shortlist.controller.js';

const router = Router();

router.post('/evaluate/:jobId', evaluateShortlist);

export default router;
