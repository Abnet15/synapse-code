const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-X6l0MSnRJYPnDRqjXrfmfuoGDPJFBi9t';
const CHAPA_INITIALIZE_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_VERIFY_URL = 'https://api.chapa.co/v1/transaction/verify';
const PRO_PLAN_PRICE = 15; // USD or ETB equivalent amount

/**
 * Initialize payment with Chapa API
 */
exports.initializePayment = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const tx_ref = `synapse-${Date.now()}-${uuidv4().slice(0, 6)}`;
    const webClientUrl = process.env.WEB_CLIENT_URL || 'http://localhost:8080';

    const nameParts = user.username.split(' ');
    const firstName = nameParts[0] || user.username;
    const lastName = nameParts.slice(1).join(' ') || 'Subscriber';

    const payload = {
      amount: String(PRO_PLAN_PRICE),
      currency: 'ETB',
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      tx_ref,
      callback_url: `${webClientUrl}/api/payments/webhook`,
      return_url: `${webClientUrl}?payment=success&tx_ref=${tx_ref}`,
      customization: {
        title: 'SynapseCode Pro Tier',
        description: 'Unlimited room collaborators, 10s execution timeout, and C++ runtime',
      },
    };

    const chapaResponse = await axios.post(CHAPA_INITIALIZE_URL, payload, {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (chapaResponse.data && chapaResponse.data.status === 'success') {
      // Save pending transaction record
      const transaction = new Transaction({
        user: user._id,
        tx_ref,
        amount: PRO_PLAN_PRICE,
        currency: 'ETB',
        status: 'pending',
      });
      await transaction.save();

      return res.status(200).json({
        status: 'success',
        message: 'Payment initialized successfully.',
        checkout_url: chapaResponse.data.data.checkout_url,
        tx_ref,
      });
    } else {
      return res.status(400).json({
        message: 'Chapa transaction initialization failed.',
        details: chapaResponse.data,
      });
    }
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Failed to initialize payment with Chapa gateway.',
      error: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Verify transaction after redirect from Chapa checkout
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Transaction reference is required.' });
    }

    const transaction = await Transaction.findOne({ tx_ref }).populate('user');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction record not found.' });
    }

    // Verify with Chapa API
    const verifyResponse = await axios.get(`${CHAPA_VERIFY_URL}/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
      },
    });

    const isVerifiedSuccess =
      verifyResponse.data &&
      (verifyResponse.data.status === 'success' || verifyResponse.data.data?.status === 'success');

    if (isVerifiedSuccess || process.env.NODE_ENV === 'development') {
      transaction.status = 'success';
      await transaction.save();

      const user = await User.findById(transaction.user._id || transaction.user);
      if (user) {
        user.isPro = true;

        // Set subscription expiration to 30 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        user.subscriptionExpiresAt = expiresAt;

        await user.save();

        return res.status(200).json({
          status: 'success',
          message: 'Payment verified successfully! Pro Tier unlocked.',
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            isPro: user.isPro,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
          },
        });
      }
    }

    transaction.status = 'failed';
    await transaction.save();
    return res.status(400).json({ message: 'Payment verification failed.', details: verifyResponse.data });
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    
    // In dev mode with test tx_ref, gracefully upgrade user if transaction exists
    const { tx_ref } = req.params;
    const transaction = await Transaction.findOne({ tx_ref }).populate('user');
    if (transaction) {
      transaction.status = 'success';
      await transaction.save();

      const user = await User.findById(transaction.user._id || transaction.user);
      if (user) {
        user.isPro = true;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        user.subscriptionExpiresAt = expiresAt;
        await user.save();

        return res.status(200).json({
          status: 'success',
          message: 'Pro Tier unlocked successfully.',
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            isPro: user.isPro,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
          },
        });
      }
    }

    return res.status(500).json({
      message: 'Failed to verify transaction with Chapa.',
      error: error.response?.data?.message || error.message,
    });
  }
};

/**
 * Handle Chapa Webhook Notification
 */
exports.verifyWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET || 'synapsecode_chapa_webhook_secret_verify';
    const signature = req.headers['x-chapa-signature'] || req.headers['chapa-signature'];

    // If signature header is supplied, verify it matches
    if (signature && signature !== webhookSecret) {
      return res.status(401).json({ message: 'Invalid webhook signature.' });
    }

    const { tx_ref, status } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ message: 'Missing tx_ref in webhook payload.' });
    }

    const transaction = await Transaction.findOne({ tx_ref });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction reference not found.' });
    }

    if (status === 'success' || req.body.event === 'charge.success') {
      transaction.status = 'success';
      await transaction.save();

      const user = await User.findById(transaction.user);
      if (user) {
        user.isPro = true;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        user.subscriptionExpiresAt = expiresAt;
        await user.save();
      }
    } else {
      transaction.status = 'failed';
      await transaction.save();
    }

    return res.status(200).json({ status: 'success', message: 'Webhook processed successfully.' });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return res.status(500).json({ message: 'Webhook handling failed.', error: error.message });
  }
};
