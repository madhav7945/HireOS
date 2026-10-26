import { Router } from 'express';
import { login, verifySession } from '../../controllers/auth.controller.js';

const router = Router();

router.post('/login', login);
router.get('/verify', verifySession);

export default router;
