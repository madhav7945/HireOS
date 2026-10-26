import { Router } from 'express';
import { getAllCandidates, applyForJob, getCandidatesByJob, getCandidateById, updateCandidate, deleteCandidate } from '../../controllers/candidates.controller.js';

const router = Router();

router.get('/', getAllCandidates);
router.post('/', applyForJob);
router.post('/apply', applyForJob);
router.get('/job/:jobId', getCandidatesByJob);
router.get('/:id', getCandidateById);
router.put('/:id', updateCandidate);
router.patch('/:id', updateCandidate);
router.delete('/:id', deleteCandidate);

export default router;
