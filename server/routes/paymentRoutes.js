const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

router.post('/initialize', authMiddleware, paymentController.initializePayment);
router.get('/verify/:tx_ref', authMiddleware, paymentController.verifyPayment);
router.post('/webhook', paymentController.verifyWebhook);

module.exports = router;
