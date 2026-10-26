import { Router } from 'express';
import { getCalendarEvents, createCalendarEvent } from '../../controllers/calendar.controller.js';

const router = Router();

router.get('/', getCalendarEvents);
router.post('/', createCalendarEvent);

export default router;
