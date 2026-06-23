const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { registerUser, loginUser, getUserProfile, updateUserProfile, toggle2FA, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', [
  body('name', 'Name is required').not().isEmpty().trim().escape(),
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 }),
  body('role', 'Role must be entrepreneur or investor').isIn(['entrepreneur', 'investor', 'Entrepreneur', 'Investor'])
], validateRequest, registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user & get token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], validateRequest, loginUser);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify 2FA OTP
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: OTP Verified
 */
router.post('/verify-otp', [
  body('email', 'Please include a valid email').isEmail(),
  body('otp', 'OTP is required').isLength({ min: 6, max: 6 })
], validateRequest, verifyOTP);

/**
 * @swagger
 * /api/auth/toggle-2fa:
 *   post:
 *     summary: Enable or disable 2FA
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA toggled
 */
router.post('/toggle-2fa', protect, toggle2FA);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User Profile Data
 */
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

module.exports = router;