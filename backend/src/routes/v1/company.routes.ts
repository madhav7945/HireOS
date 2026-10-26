import { Router } from 'express';
import { getCompany, updateCompany } from '../../controllers/company.controller.js';

const router = Router();

router.get('/', getCompany);
router.post('/', updateCompany);

export default router;
