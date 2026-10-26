import { Router } from 'express';
import { 
  createInterview, getInterviewSession, scheduleHrInterview, 
  getInterviews, getInterviewById, updateInterview,
  startInterviewSession, chatInterviewStream 
} from '../../controllers/interviews.controller.js';

const router = Router();

router.get('/', getInterviews);
router.post('/', createInterview);
router.post('/start-interview', startInterviewSession);
router.post('/chat', chatInterviewStream);
router.get('/:id', getInterviewById);
router.patch('/:id', updateInterview);
router.put('/:id', updateInterview);
router.get('/session/:token', getInterviewSession);
router.post('/schedule', scheduleHrInterview);

export default router;
