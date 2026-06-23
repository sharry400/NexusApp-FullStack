const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getTransactions, getWalletBalance, deposit, withdraw, transfer } = require('../controllers/paymentController');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Mock Payment Gateway
 */

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all transactions for the logged in user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 */
router.get('/', protect, getTransactions);

/**
 * @swagger
 * /api/payments/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current balance
 */
router.get('/balance', protect, getWalletBalance);

/**
 * @swagger
 * /api/payments/deposit:
 *   post:
 *     summary: Deposit mock funds
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Deposit successful
 */
router.post('/deposit', protect, deposit);

/**
 * @swagger
 * /api/payments/withdraw:
 *   post:
 *     summary: Withdraw mock funds
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Withdrawal successful
 */
router.post('/withdraw', protect, withdraw);

/**
 * @swagger
 * /api/payments/transfer:
 *   post:
 *     summary: Transfer mock funds to another user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Transfer successful
 */
router.post('/transfer', protect, transfer);

module.exports = router;
