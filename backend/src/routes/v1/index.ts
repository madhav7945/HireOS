import { Router } from 'express';
import offersRoutes from './offers.routes.js';
import jobsRoutes from './jobs.routes.js';
import candidatesRoutes from './candidates.routes.js';
import shortlistRoutes from './shortlist.routes.js';
import authRoutes from './auth.routes.js';
import reportsRoutes from './reports.routes.js';
import interviewsRoutes from './interviews.routes.js';
import companyRoutes from './company.routes.js';
import tasksRoutes from './tasks.routes.js';
import activityRoutes from './activity.routes.js';
import departmentsRoutes from './departments.routes.js';
import calendarRoutes from './calendar.routes.js';
import interviewMessagesRoutes from './interviewMessages.routes.js';

const router = Router();

// Mount routes
router.use('/offers', offersRoutes);
router.use('/jobs', jobsRoutes);
router.use('/candidates', candidatesRoutes);
router.use('/shortlist', shortlistRoutes);
router.use('/auth', authRoutes);
router.use('/reports', reportsRoutes);
router.use('/interviews', interviewsRoutes);
router.use('/company', companyRoutes);
router.use('/tasks', tasksRoutes);
router.use('/activity', activityRoutes);
router.use('/departments', departmentsRoutes);
router.use('/calendar', calendarRoutes);
router.use('/interview-messages', interviewMessagesRoutes);

export default router;
