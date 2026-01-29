/**
 * Authentication helper functions
 * Handles password validation, hashing, and token generation
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

// Password requirements
const PASSWORD_MIN_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

// Session duration (7 days in milliseconds)
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Verification token expiry (24 hours)
const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Password reset expiry (1 hour)
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Password validation regex
 * - At least 12 characters
 * - At least one letter (a-z, A-Z)
 * - At least one number (0-9)
 * - At least one symbol
 */
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{}|;:',.<>\/?\\`~"]).{12,}$/;

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate password against requirements
 * @param {string} password
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password is required'] };
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (!/[a-zA-Z]/.test(password)) {
        errors.push('Password must contain at least one letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:',.<>\/?\\`~"]/.test(password)) {
        errors.push('Password must contain at least one symbol (!@#$%^&*()_+-=[]{}|;:\',.<>/?\\`~")');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Hash a password
 * @param {string} password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token (UUID v4)
 * @returns {string}
 */
function generateToken() {
    return uuidv4();
}

/**
 * Generate session expiry date (7 days from now)
 * @returns {string} ISO date string
 */
function generateSessionExpiry() {
    return new Date(Date.now() + SESSION_DURATION_MS).toISOString();
}

/**
 * Generate verification token expiry (24 hours from now)
 * @returns {string} ISO date string
 */
function generateVerificationExpiry() {
    return new Date(Date.now() + VERIFICATION_EXPIRY_MS).toISOString();
}

/**
 * Generate password reset expiry (1 hour from now)
 * @returns {string} ISO date string
 */
function generatePasswordResetExpiry() {
    return new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS).toISOString();
}

/**
 * Extract bearer token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

    return parts[1];
}

/**
 * Get client IP from request (handles proxies)
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
}

/**
 * Sanitize user object for API response (remove sensitive fields)
 * @param {Object} user - User from database
 * @returns {Object} Safe user object
 */
function sanitizeUser(user) {
    if (!user) return null;

    return {
        id: user.id,
        email: user.email,
        email_verified: !!user.email_verified,
        tier: user.tier,
        is_superuser: db.isSuperuser(user.email),
        created_at: user.created_at,
        last_login: user.last_login
    };
}

module.exports = {
    // Validation
    validateEmail,
    validatePassword,
    PASSWORD_MIN_LENGTH,

    // Password handling
    hashPassword,
    verifyPassword,

    // Token generation
    generateToken,
    generateSessionExpiry,
    generateVerificationExpiry,
    generatePasswordResetExpiry,

    // Request helpers
    extractBearerToken,
    getClientIP,

    // Response helpers
    sanitizeUser
};
