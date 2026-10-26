import { Router } from 'express';
import { OffersController } from '../../controllers/offers.controller.js';

const router = Router();

router.get('/', OffersController.getOffers);
router.post('/', OffersController.generateOffer);
router.post('/generate', OffersController.generateOffer);
router.post('/sign', OffersController.signOffer);
router.get('/:token', OffersController.getOfferByToken);
router.patch('/:id', OffersController.updateOffer);
router.put('/:id', OffersController.updateOffer);

export default router;
