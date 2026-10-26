import { Router } from 'express';
import { getDepartments, createDepartment } from '../../controllers/departments.controller.js';

const router = Router();

router.get('/', getDepartments);
router.post('/', createDepartment);

export default router;
