const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const twoFactorAuth = require('../utils/twoFactorAuth');

// Configure nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Register new user
router.post('/register', [
    body('username').trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            username,
            email,
            password
        });

        // Generate email verification token
        const token = user.generateEmailVerificationToken();
        await user.save();

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Verify your email address',
            html: `
                <h2>Welcome to TechNest Solutions!</h2>
                <p>Please verify your email address by clicking the link below:</p>
                <a href="${verificationUrl}">${verificationUrl}</a>
                <p>This link will expire in 24 hours.</p>
            `
        });

        // Generate JWT token
        const jwtToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if 2FA is enabled
        if (user.securitySettings.twoFactorEnabled) {
            return res.json({
                require2FA: true,
                email: user.email
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Forgot password
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Generate password reset token
        const token = user.generatePasswordResetToken();
        await user.save();

        // Send password reset email
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        });

        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset password
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findOne({
            passwordResetToken: req.params.token,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', [
    auth,
    body('firstName').optional().trim(),
    body('lastName').optional().trim(),
    body('bio').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { firstName, lastName, bio } = req.body;
        user.profile = {
            ...user.profile,
            firstName,
            lastName,
            bio
        };

        await user.save();
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password
router.put('/change-password', [
    auth,
    body('currentPassword').exists(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { currentPassword, newPassword } = req.body;
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Setup 2FA
router.post('/2fa/setup', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate secret
        const { base32: secret, otpauth_url } = twoFactorAuth.generateSecret(user.email);
        
        // Generate QR code
        const qrCode = await twoFactorAuth.generateQRCode(otpauth_url);
        
        // Generate backup codes
        const backupCodes = twoFactorAuth.generateBackupCodes();
        
        // Save encrypted secret and backup codes
        user.securitySettings.twoFactorSecret = twoFactorAuth.encrypt2FASecret(secret);
        user.securitySettings.twoFactorBackupCodes = backupCodes;
        await user.save();

        res.json({
            qrCode,
            backupCodes,
            secret
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify and enable 2FA
router.post('/2fa/verify', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Decrypt the secret
        const secret = twoFactorAuth.decrypt2FASecret(user.securitySettings.twoFactorSecret);
        
        // Verify the token
        const isValid = twoFactorAuth.verifyToken(token, secret);
        
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Enable 2FA
        user.securitySettings.twoFactorEnabled = true;
        await user.save();

        res.json({ message: '2FA enabled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Validate 2FA token during login
router.post('/2fa/validate', async (req, res) => {
    try {
        const { email, token } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.securitySettings.twoFactorEnabled) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        // Decrypt the secret
        const secret = twoFactorAuth.decrypt2FASecret(user.securitySettings.twoFactorSecret);
        
        // Verify the token
        const isValid = twoFactorAuth.verifyToken(token, secret);
        
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Generate JWT token
        const jwtToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Disable 2FA
router.post('/2fa/disable', auth, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify token before disabling
        const secret = twoFactorAuth.decrypt2FASecret(user.securitySettings.twoFactorSecret);
        const isValid = twoFactorAuth.verifyToken(token, secret);
        
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Disable 2FA
        user.securitySettings.twoFactorEnabled = false;
        user.securitySettings.twoFactorSecret = undefined;
        user.securitySettings.twoFactorBackupCodes = undefined;
        await user.save();

        res.json({ message: '2FA disabled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Use backup code
router.post('/2fa/backup', async (req, res) => {
    try {
        const { email, backupCode } = req.body;
        const user = await User.findOne({ email });

        if (!user || !user.securitySettings.twoFactorEnabled) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        // Check if backup code exists and hasn't been used
        const validBackupCode = user.securitySettings.twoFactorBackupCodes.includes(backupCode);
        
        if (!validBackupCode) {
            return res.status(400).json({ message: 'Invalid backup code' });
        }

        // Remove used backup code
        user.securitySettings.twoFactorBackupCodes = user.securitySettings.twoFactorBackupCodes
            .filter(code => code !== backupCode);
        await user.save();

        // Generate JWT token
        const jwtToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;