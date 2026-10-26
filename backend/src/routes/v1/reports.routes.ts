import { Router } from 'express';
import { getDashboardMetrics } from '../../controllers/reports.controller.js';

const router = Router();

router.get('/dashboard', getDashboardMetrics);

export default router;
