import { Router } from 'express';
import { getActivity, createActivity } from '../../controllers/activity.controller.js';

const router = Router();

router.get('/', getActivity);
router.post('/', createActivity);

export default router;
