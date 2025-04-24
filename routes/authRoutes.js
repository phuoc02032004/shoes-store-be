// routes/authRoutes.js
const express = require('express');
const {
    register,
    login,
    getMe,
    logout,
    verifyOtp
} = require('../controllers/authController'); // Import các hàm controller

// Import middleware bảo vệ route
const { protect } = require('../middleware/authMiddleware');

// Khởi tạo router
const router = express.Router();

// --- Swagger Tag Definition ---
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and User Management (Register, Login, OTP Verification, User Info, Logout)
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: Create a new user account. Requires a valid name, email, and password (at least 6 characters). Upon successful registration, an OTP is sent to the email for verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *           example:
 *             name: John Doe
 *             email: user@example.com
 *             password: password123
 *     responses:
 *       201:
 *         description: Registration successful, OTP sent for verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Registration successful! An OTP has been sent to user@example.com. Please enter the code to verify your account.
 *       400:
 *         description: Invalid input data (Missing information, Invalid email format, Password too short, Email already exists and is verified).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error (Unable to send email, Database error).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify user account with OTP
 *     tags: [Auth]
 *     description: Verify the user account using the email and the 6-digit OTP received via email after registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The registered email address.
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 description: The 6-digit OTP received via email.
 *                 example: "123456"
 *                 pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: Account verification successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Account verified successfully! You can now log in.
 *       400:
 *         description: Invalid data (Missing email/otp, Invalid OTP format, Incorrect OTP, Expired OTP, Account already verified).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found (Email not found).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *                success: false
 *                message: Invalid email or OTP.
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/verify-otp', verifyOtp);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in to the system
 *     tags: [Auth]
 *     description: Authenticate user with email and password. Successful only if the account has been verified with OTP. Returns a JWT token and user information.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserLogin'
 *           example:
 *             email: user@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenResponse'
 *       400:
 *         description: Invalid data (Missing email/password).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication failed (Incorrect email/password, Account not verified).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalidCredentials:
 *                 value:
 *                   success: false
 *                   message: Invalid credentials.
 *               notVerified:
 *                 value:
 *                   success: false
 *                   message: Account not verified. Please check your email and enter the OTP.
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user's information
 *     tags: [Auth]
 *     description: Returns detailed information about the user authenticated via JWT token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Not logged in or invalid/expired token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *                 noToken:
 *                    value:
 *                       success: false
 *                       message: Access denied. Please log in.
 *                 invalidToken:
 *                    value:
 *                       success: false
 *                       message: Access denied. Invalid token.
 *                 expiredToken:
 *                    value:
 *                       success: false
 *                       message: Login session expired. Please log in again.
 *       404:
 *         description: User corresponding to the token no longer exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out user
 *     tags: [Auth]
 *     description: Performs the logout action. If using cookies, it will clear the 'token' cookie. If the token is stored client-side, the client needs to remove the token after calling this API.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: Logout successful.
 *       401:
 *         description: Not logged in or invalid/expired token (due to protect middleware).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', protect, logout);

// Xuất router để sử dụng trong server.js
module.exports = router;