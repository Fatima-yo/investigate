/**
 * Database module for TAC authentication and query tracking
 * Uses SQLite with better-sqlite3 for synchronous operations
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'investigate.db');

// Superuser emails (hardcoded for security)
const SUPERUSER_EMAILS = [
    'castiglionemaldonado@gmail.com'
];

// Initialize database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema
 * Creates all required tables if they don't exist
 */
function initializeSchema() {
    // Visitors table - tracks anonymous users by fingerprint
    db.exec(`
        CREATE TABLE IF NOT EXISTS visitors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint TEXT NOT NULL UNIQUE,
            ip_address TEXT,
            user_agent TEXT,
            language TEXT,
            timezone TEXT,
            screen_resolution TEXT,
            platform TEXT,
            referrer TEXT,
            query_count INTEGER DEFAULT 0,
            first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Users table - registered accounts
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            verification_expires DATETIME,
            tier TEXT DEFAULT 'free',
            query_limit INTEGER DEFAULT NULL,
            visitor_id INTEGER,
            is_superuser INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        )
    `);

    // Migration: Add is_superuser column if it doesn't exist
    try {
        db.exec(`ALTER TABLE users ADD COLUMN is_superuser INTEGER DEFAULT 0`);
        console.log('Added is_superuser column to users table');
    } catch (e) {
        // Column already exists, ignore
    }

    // Sessions table - active login sessions
    db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            ip_address TEXT,
            user_agent TEXT,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Query log table - all queries from all users
    db.exec(`
        CREATE TABLE IF NOT EXISTS query_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id INTEGER,
            user_id INTEGER,
            address TEXT NOT NULL,
            blockchain TEXT,
            query_type TEXT,
            ip_address TEXT,
            user_agent TEXT,
            response_status TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (visitor_id) REFERENCES visitors(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Password resets table
    db.exec(`
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_visitors_fingerprint ON visitors(fingerprint);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_query_log_user_id ON query_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_query_log_visitor_id ON query_log(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    `);

    console.log('Database schema initialized successfully');
}

// ============================================
// VISITOR OPERATIONS
// ============================================

/**
 * Create or update a visitor record
 * @param {Object} visitorData - Visitor information
 * @returns {Object} Visitor record with query count
 */
function upsertVisitor(visitorData) {
    const { fingerprint, ip_address, user_agent, language, timezone, screen_resolution, platform, referrer } = visitorData;

    // Try to find existing visitor
    const existing = db.prepare('SELECT * FROM visitors WHERE fingerprint = ?').get(fingerprint);

    if (existing) {
        // Update last_seen
        db.prepare(`
            UPDATE visitors
            SET last_seen = CURRENT_TIMESTAMP,
                ip_address = COALESCE(?, ip_address),
                user_agent = COALESCE(?, user_agent)
            WHERE fingerprint = ?
        `).run(ip_address, user_agent, fingerprint);

        return {
            id: existing.id,
            fingerprint: existing.fingerprint,
            query_count: existing.query_count,
            queries_remaining: Math.max(0, 3 - existing.query_count),
            is_new: false
        };
    }

    // Create new visitor
    const result = db.prepare(`
        INSERT INTO visitors (fingerprint, ip_address, user_agent, language, timezone, screen_resolution, platform, referrer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(fingerprint, ip_address, user_agent, language, timezone, screen_resolution, platform, referrer);

    return {
        id: result.lastInsertRowid,
        fingerprint,
        query_count: 0,
        queries_remaining: 3,
        is_new: true
    };
}

/**
 * Get visitor by fingerprint
 * @param {string} fingerprint
 * @returns {Object|null} Visitor record
 */
function getVisitorByFingerprint(fingerprint) {
    return db.prepare('SELECT * FROM visitors WHERE fingerprint = ?').get(fingerprint);
}

/**
 * Get visitor by ID
 * @param {number} id
 * @returns {Object|null} Visitor record
 */
function getVisitorById(id) {
    return db.prepare('SELECT * FROM visitors WHERE id = ?').get(id);
}

/**
 * Increment visitor query count
 * @param {number} visitorId
 * @returns {number} New query count
 */
function incrementVisitorQueryCount(visitorId) {
    db.prepare('UPDATE visitors SET query_count = query_count + 1 WHERE id = ?').run(visitorId);
    const visitor = getVisitorById(visitorId);
    return visitor ? visitor.query_count : 0;
}

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create a new user
 * @param {Object} userData - User information
 * @returns {Object} Created user (without password)
 */
function createUser(userData) {
    const { email, password_hash, visitor_id, verification_token, verification_expires } = userData;

    const result = db.prepare(`
        INSERT INTO users (email, password_hash, visitor_id, verification_token, verification_expires)
        VALUES (?, ?, ?, ?, ?)
    `).run(email, password_hash, visitor_id, verification_token, verification_expires);

    return {
        id: result.lastInsertRowid,
        email,
        email_verified: false,
        tier: 'free',
        created_at: new Date().toISOString()
    };
}

/**
 * Get user by email
 * @param {string} email
 * @returns {Object|null} User record
 */
function getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

/**
 * Get user by ID
 * @param {number} id
 * @returns {Object|null} User record
 */
function getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * Check if a user is a superuser
 * @param {string} email - User email
 * @returns {boolean} True if superuser
 */
function isSuperuser(email) {
    if (!email) return false;
    return SUPERUSER_EMAILS.includes(email.toLowerCase());
}

/**
 * Get user with superuser status
 * @param {Object} user - User record from database
 * @returns {Object} User with is_superuser field
 */
function withSuperuserStatus(user) {
    if (!user) return null;
    return {
        ...user,
        is_superuser: isSuperuser(user.email) ? 1 : (user.is_superuser || 0)
    };
}

/**
 * Verify user email
 * @param {string} token - Verification token
 * @returns {boolean} Success
 */
function verifyUserEmail(token) {
    const user = db.prepare(`
        SELECT * FROM users
        WHERE verification_token = ?
        AND verification_expires > datetime('now')
        AND email_verified = 0
    `).get(token);

    if (!user) return false;

    db.prepare(`
        UPDATE users
        SET email_verified = 1, verification_token = NULL, verification_expires = NULL
        WHERE id = ?
    `).run(user.id);

    return true;
}

/**
 * Update user last login
 * @param {number} userId
 */
function updateUserLastLogin(userId) {
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
}

/**
 * Update user password
 * @param {number} userId
 * @param {string} passwordHash
 */
function updateUserPassword(userId, passwordHash) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}

// ============================================
// SESSION OPERATIONS
// ============================================

/**
 * Create a new session
 * @param {Object} sessionData
 * @returns {Object} Session with token
 */
function createSession(sessionData) {
    const { user_id, token, ip_address, user_agent, expires_at } = sessionData;

    const result = db.prepare(`
        INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(user_id, token, ip_address, user_agent, expires_at);

    return {
        id: result.lastInsertRowid,
        token,
        expires_at
    };
}

/**
 * Get session by token
 * @param {string} token
 * @returns {Object|null} Session with user info
 */
function getSessionByToken(token) {
    return db.prepare(`
        SELECT s.*, u.id as user_id, u.email, u.email_verified, u.tier
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token);
}

/**
 * Delete session (logout)
 * @param {string} token
 */
function deleteSession(token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Delete all sessions for a user
 * @param {number} userId
 */
function deleteUserSessions(userId) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

/**
 * Clean up expired sessions
 */
function cleanExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// ============================================
// QUERY LOG OPERATIONS
// ============================================

/**
 * Log a query
 * @param {Object} queryData
 * @returns {Object} Created log entry
 */
function logQuery(queryData) {
    const { visitor_id, user_id, address, blockchain, query_type, ip_address, user_agent, response_status } = queryData;

    const result = db.prepare(`
        INSERT INTO query_log (visitor_id, user_id, address, blockchain, query_type, ip_address, user_agent, response_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(visitor_id || null, user_id || null, address, blockchain, query_type, ip_address, user_agent, response_status);

    return { id: result.lastInsertRowid };
}

/**
 * Update the response_status of the most recent query for an address
 * @param {Object} params
 * @returns {boolean} Success
 */
function updateQueryResult({ user_id, visitor_id, address, response_status }) {
    const result = db.prepare(`
        UPDATE query_log
        SET response_status = ?
        WHERE id = (
            SELECT id FROM query_log
            WHERE address = ?
            AND (user_id = ? OR visitor_id = ?)
            ORDER BY created_at DESC
            LIMIT 1
        )
    `).run(response_status, address, user_id || null, visitor_id || null);

    return result.changes > 0;
}

/**
 * Get query history for a user
 * @param {number} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Object} Paginated query history
 */
function getUserQueryHistory(userId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const queries = db.prepare(`
        SELECT address, blockchain, query_type, response_status, created_at
        FROM query_log
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const totalResult = db.prepare('SELECT COUNT(*) as total FROM query_log WHERE user_id = ?').get(userId);
    const total = totalResult ? totalResult.total : 0;

    return {
        queries,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get all users' query history (superuser only)
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Paginated query history with user info
 */
function getAllQueryHistory(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const queries = db.prepare(`
        SELECT
            q.address,
            q.blockchain,
            q.query_type,
            q.response_status,
            q.created_at,
            q.user_id,
            q.visitor_id,
            u.email as user_email
        FROM query_log q
        LEFT JOIN users u ON q.user_id = u.id
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalResult = db.prepare('SELECT COUNT(*) as total FROM query_log').get();
    const total = totalResult ? totalResult.total : 0;

    return {
        queries,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get query count for a user today
 * @param {number} userId
 * @returns {number} Query count
 */
function getUserQueryCountToday(userId) {
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM query_log
        WHERE user_id = ? AND date(created_at) = date('now')
    `).get(userId);
    return result ? result.count : 0;
}

// ============================================
// PASSWORD RESET OPERATIONS
// ============================================

/**
 * Create a password reset token
 * @param {number} userId
 * @param {string} token
 * @param {string} expiresAt
 * @returns {Object} Reset record
 */
function createPasswordReset(userId, token, expiresAt) {
    // Invalidate any existing reset tokens for this user
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0').run(userId);

    const result = db.prepare(`
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `).run(userId, token, expiresAt);

    return { id: result.lastInsertRowid, token };
}

/**
 * Get valid password reset by token
 * @param {string} token
 * @returns {Object|null} Reset record with user
 */
function getPasswordResetByToken(token) {
    return db.prepare(`
        SELECT pr.*, u.email
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.token = ?
        AND pr.expires_at > datetime('now')
        AND pr.used = 0
    `).get(token);
}

/**
 * Mark password reset as used
 * @param {string} token
 */
function markPasswordResetUsed(token) {
    db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    db,
    initializeSchema,
    // Visitors
    upsertVisitor,
    getVisitorByFingerprint,
    getVisitorById,
    incrementVisitorQueryCount,
    // Users
    createUser,
    getUserByEmail,
    getUserById,
    verifyUserEmail,
    updateUserLastLogin,
    updateUserPassword,
    isSuperuser,
    withSuperuserStatus,
    SUPERUSER_EMAILS,
    // Sessions
    createSession,
    getSessionByToken,
    deleteSession,
    deleteUserSessions,
    cleanExpiredSessions,
    // Query log
    logQuery,
    updateQueryResult,
    getUserQueryHistory,
    getAllQueryHistory,
    getUserQueryCountToday,
    // Password resets
    createPasswordReset,
    getPasswordResetByToken,
    markPasswordResetUsed
};
