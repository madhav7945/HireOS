import { Router } from 'express';
import { getJobs, createJob, getJobById, updateJob, deleteJob } from '../../controllers/jobs.controller.js';

const router = Router();

router.get('/', getJobs);
router.post('/', createJob);
router.get('/:id', getJobById);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

export default router;
