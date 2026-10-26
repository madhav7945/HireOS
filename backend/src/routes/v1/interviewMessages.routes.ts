import { Router } from 'express';
import { getInterviewMessages, createInterviewMessage } from '../../controllers/interviewMessages.controller.js';

const router = Router();

router.get('/:interviewId', getInterviewMessages);
router.post('/:interviewId', createInterviewMessage);

export default router;
