const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Database and authentication modules
const db = require('./database');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching for development
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

app.use(express.static('.')); // Serve static files from current directory

// ============================================
// BLOCKCHAIN API PROXIES
// ============================================

// Tron API proxy to avoid CORS issues
app.get('/api/tron/account/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Tron API error:', error);
        res.status(500).json({ error: 'Failed to fetch Tron data' });
    }
});

app.get('/api/tron/trc20/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const response = await fetch(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?limit=200`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Tron TRC20 API error:', error);
        res.status(500).json({ error: 'Failed to fetch TRC20 data' });
    }
});

// Solana API proxy to avoid CORS issues
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

app.get('/api/solana/account/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [address, { encoding: 'jsonParsed' }]
            })
        });
        const data = await response.json();
        if (data.result?.value) {
            res.json({
                lamports: data.result.value.lamports,
                executable: data.result.value.executable,
                owner: data.result.value.owner
            });
        } else {
            res.json({ lamports: 0, executable: false });
        }
    } catch (error) {
        console.error('Solana account API error:', error);
        res.status(500).json({ error: 'Failed to fetch Solana account data' });
    }
});

app.get('/api/solana/tokens/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const response = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenAccountsByOwner',
                params: [
                    address,
                    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                    { encoding: 'jsonParsed' }
                ]
            })
        });
        const data = await response.json();
        const tokens = [];
        if (data.result?.value) {
            for (const account of data.result.value) {
                const tokenData = account.account.data.parsed?.info;
                if (tokenData) {
                    tokens.push({
                        mint: tokenData.mint,
                        amount: parseFloat(tokenData.tokenAmount?.amount || 0),
                        decimals: tokenData.tokenAmount?.decimals || 0
                    });
                }
            }
        }
        res.json({ tokens });
    } catch (error) {
        console.error('Solana tokens API error:', error);
        res.status(500).json({ error: 'Failed to fetch Solana token data' });
    }
});

app.get('/api/solana/transfers/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const transfers = [];

        // First, get all token accounts owned by this address
        const tokenAccountsResponse = await fetch(SOLANA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenAccountsByOwner',
                params: [
                    address,
                    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                    { encoding: 'jsonParsed' }
                ]
            })
        });
        const tokenAccountsData = await tokenAccountsResponse.json();

        // Find USDT/USDC token accounts
        const tokenAccountPubkeys = [];
        if (tokenAccountsData.result?.value) {
            for (const account of tokenAccountsData.result.value) {
                const mint = account.account?.data?.parsed?.info?.mint;
                if (mint === USDT_MINT || mint === USDC_MINT) {
                    tokenAccountPubkeys.push(account.pubkey);
                }
            }
        }

        // Get signatures for each token account
        const allSignatures = [];
        for (const tokenAccount of tokenAccountPubkeys) {
            const sigResponse = await fetch(SOLANA_RPC, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [tokenAccount, { limit: 50 }]
                })
            });
            const sigData = await sigResponse.json();
            if (sigData.result) {
                for (const sig of sigData.result) {
                    allSignatures.push(sig.signature);
                }
            }
        }

        // Remove duplicates and limit
        const uniqueSignatures = [...new Set(allSignatures)].slice(0, 50);

        // Get transaction details
        for (const signature of uniqueSignatures) {
            try {
                const txResponse = await fetch(SOLANA_RPC, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getTransaction',
                        params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
                    })
                });
                const txData = await txResponse.json();

                if (txData.result?.meta?.postTokenBalances) {
                    const pre = txData.result.meta.preTokenBalances || [];
                    const post = txData.result.meta.postTokenBalances;

                    // Find token balance changes for USDT/USDC belonging to this address
                    for (const postBalance of post) {
                        if ((postBalance.mint === USDT_MINT || postBalance.mint === USDC_MINT) && postBalance.owner === address) {
                            const preBalance = pre.find(p => p.accountIndex === postBalance.accountIndex);
                            const preAmount = preBalance?.uiTokenAmount?.uiAmount || 0;
                            const postAmount = postBalance.uiTokenAmount?.uiAmount || 0;
                            const diff = postAmount - preAmount;

                            if (Math.abs(diff) > 0.01) {
                                transfers.push({
                                    signature: signature,
                                    mint: postBalance.mint,
                                    amount: Math.abs(diff) * Math.pow(10, postBalance.uiTokenAmount?.decimals || 6),
                                    decimals: postBalance.uiTokenAmount?.decimals || 6,
                                    destination: diff > 0 ? address : null,
                                    source: diff < 0 ? address : null,
                                    blockTime: txData.result.blockTime
                                });
                            }
                        }
                    }
                }
            } catch (txError) {
                console.error('Error fetching transaction:', txError);
            }
        }

        // Sort by blockTime descending
        transfers.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

        res.json({ transfers });
    } catch (error) {
        console.error('Solana transfers API error:', error);
        res.status(500).json({ error: 'Failed to fetch Solana transfer data' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Investigate Blockchain Explorer API'
    });
});

// ============================================
// VISITOR TRACKING
// ============================================

/**
 * POST /api/visitor
 * Register or update a visitor based on fingerprint
 */
app.post('/api/visitor', (req, res) => {
    try {
        const { fingerprint, language, timezone, screen_resolution, platform, referrer } = req.body;

        if (!fingerprint) {
            return res.status(400).json({ error: 'Fingerprint is required' });
        }

        const ip_address = auth.getClientIP(req);
        const user_agent = req.headers['user-agent'];

        const visitor = db.upsertVisitor({
            fingerprint,
            ip_address,
            user_agent,
            language,
            timezone,
            screen_resolution,
            platform,
            referrer
        });

        res.json({
            visitor_id: visitor.id,
            query_count: visitor.query_count,
            queries_remaining: visitor.queries_remaining
        });
    } catch (error) {
        console.error('Visitor tracking error:', error);
        res.status(500).json({ error: 'Failed to track visitor' });
    }
});

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /api/auth/register
 * Create a new user account
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, visitor_id } = req.body;

        // Validate email
        if (!auth.validateEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password
        const passwordValidation = auth.validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            });
        }

        // Check if email already exists
        const existingUser = db.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const password_hash = await auth.hashPassword(password);

        // Generate verification token
        const verification_token = auth.generateToken();
        const verification_expires = auth.generateVerificationExpiry();

        // Create user
        const user = db.createUser({
            email: email.trim().toLowerCase(),
            password_hash,
            visitor_id: visitor_id || null,
            verification_token,
            verification_expires
        });

        // TODO: Send verification email via SendGrid
        // For now, auto-verify and log the token
        console.log(`[DEV] Verification token for ${email}: ${verification_token}`);

        // Auto-verify for now (remove this when email verification is implemented)
        db.verifyUserEmail(verification_token);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: auth.sanitizeUser(user)
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * GET /api/auth/verify/:token
 * Verify user email address
 */
app.get('/api/auth/verify/:token', (req, res) => {
    try {
        const { token } = req.params;

        const success = db.verifyUserEmail(token);

        if (success) {
            // Redirect to investigate page with success message
            res.redirect('/investigate.html?verified=true');
        } else {
            res.status(400).json({ error: 'Invalid or expired verification token' });
        }
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and create session
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = db.getUserByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const validPassword = await auth.verifyPassword(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Create session
        const token = auth.generateToken();
        const expires_at = auth.generateSessionExpiry();
        const ip_address = auth.getClientIP(req);
        const user_agent = req.headers['user-agent'];

        db.createSession({
            user_id: user.id,
            token,
            ip_address,
            user_agent,
            expires_at
        });

        // Update last login
        db.updateUserLastLogin(user.id);

        res.json({
            success: true,
            token,
            user: auth.sanitizeUser(user)
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

/**
 * POST /api/auth/logout
 * Destroy user session
 */
app.post('/api/auth/logout', (req, res) => {
    try {
        const token = auth.extractBearerToken(req.headers.authorization);

        if (token) {
            db.deleteSession(token);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info from session
 */
app.get('/api/auth/me', (req, res) => {
    try {
        const token = auth.extractBearerToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const session = db.getSessionByToken(token);

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const user = db.getUserById(session.user_id);
        const queries_today = db.getUserQueryCountToday(session.user_id);

        res.json({
            user: auth.sanitizeUser(user),
            queries_today,
            session_expires: session.expires_at
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ error: 'Failed to check authentication' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
app.post('/api/auth/forgot-password', (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = db.getUserByEmail(email.trim().toLowerCase());

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({ success: true, message: 'If an account exists, a reset email has been sent' });
        }

        // Create reset token
        const token = auth.generateToken();
        const expires_at = auth.generatePasswordResetExpiry();

        db.createPasswordReset(user.id, token, expires_at);

        // TODO: Send reset email via SendGrid
        console.log(`[DEV] Password reset token for ${email}: ${token}`);

        res.json({ success: true, message: 'If an account exists, a reset email has been sent' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Validate new password
        const passwordValidation = auth.validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            });
        }

        // Get reset record
        const reset = db.getPasswordResetByToken(token);

        if (!reset) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const password_hash = await auth.hashPassword(password);

        // Update password
        db.updateUserPassword(reset.user_id, password_hash);

        // Mark reset as used
        db.markPasswordResetUsed(token);

        // Delete all sessions for this user (force re-login)
        db.deleteUserSessions(reset.user_id);

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// ============================================
// QUERY PERMISSION & LOGGING
// ============================================

/**
 * POST /api/query
 * Check if user can make a query, log it, and update counters
 */
app.post('/api/query', (req, res) => {
    try {
        const { address, blockchain, query_type } = req.body;
        const token = auth.extractBearerToken(req.headers.authorization);
        const visitor_id = req.headers['x-visitor-id'];
        const ip_address = auth.getClientIP(req);
        const user_agent = req.headers['user-agent'];

        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        // Check if authenticated user
        if (token) {
            const session = db.getSessionByToken(token);

            if (session) {
                // Authenticated user - allow unlimited queries
                db.logQuery({
                    user_id: session.user_id,
                    visitor_id: null,
                    address,
                    blockchain,
                    query_type,
                    ip_address,
                    user_agent,
                    response_status: 'success'
                });

                return res.json({
                    allowed: true,
                    authenticated: true
                });
            }
        }

        // Anonymous user - check visitor limit
        if (!visitor_id) {
            return res.status(400).json({
                error: 'Visitor ID required for anonymous queries',
                require_login: true
            });
        }

        const visitor = db.getVisitorById(parseInt(visitor_id));

        if (!visitor) {
            return res.status(400).json({
                error: 'Invalid visitor ID',
                require_login: true
            });
        }

        // Check if limit reached (3 free queries)
        if (visitor.query_count >= 3) {
            return res.json({
                allowed: false,
                require_login: true,
                message: 'Free query limit reached. Please create an account to continue.'
            });
        }

        // Allow query and increment counter
        const newCount = db.incrementVisitorQueryCount(visitor.id);

        // Log the query
        db.logQuery({
            visitor_id: visitor.id,
            user_id: null,
            address,
            blockchain,
            query_type,
            ip_address,
            user_agent,
            response_status: 'success'
        });

        res.json({
            allowed: true,
            authenticated: false,
            queries_remaining: Math.max(0, 3 - newCount)
        });
    } catch (error) {
        console.error('Query permission error:', error);
        res.status(500).json({ error: 'Failed to check query permission' });
    }
});

/**
 * POST /api/investigate
 * Log a blockchain address investigation query
 */
app.post('/api/investigate', (req, res) => {
    try {
        const { address, blockchain, query_type } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        // Get user from auth token if provided
        let user_id = null;
        const token = auth.extractBearerToken(req.headers.authorization);
        if (token) {
            const session = db.getSessionByToken(token);
            if (session) {
                user_id = session.user_id;
            }
        }

        // Log the query
        db.logQuery({
            visitor_id: null,
            user_id,
            address,
            blockchain: blockchain || 'Unknown',
            query_type: query_type || 'address',
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent'],
            response_status: 'success'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Investigate log error:', error);
        res.status(500).json({ error: 'Failed to log query' });
    }
});

/**
 * POST /api/query/result
 * Update the result status of a query after it completes
 */
app.post('/api/query/result', (req, res) => {
    try {
        const { address, response_status } = req.body;

        if (!address || !response_status) {
            return res.status(400).json({ error: 'Address and response_status are required' });
        }

        // Validate response_status values
        const validStatuses = ['found', 'no_data', 'invalid'];
        if (!validStatuses.includes(response_status)) {
            return res.status(400).json({ error: 'Invalid response_status value' });
        }

        // Get user or visitor ID
        let user_id = null;
        let visitor_id = null;

        const token = auth.extractBearerToken(req.headers.authorization);
        if (token) {
            const session = db.getSessionByToken(token);
            if (session) {
                user_id = session.user_id;
            }
        }

        if (!user_id) {
            visitor_id = req.headers['x-visitor-id'] ? parseInt(req.headers['x-visitor-id']) : null;
        }

        // Update the query result
        db.updateQueryResult({
            user_id,
            visitor_id,
            address,
            response_status
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Update query result error:', error);
        res.status(500).json({ error: 'Failed to update query result' });
    }
});

/**
 * GET /api/queries/history
 * Get query history for authenticated user
 */
app.get('/api/queries/history', (req, res) => {
    try {
        const token = auth.extractBearerToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const session = db.getSessionByToken(token);

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const history = db.getUserQueryHistory(session.user_id, page, limit);

        res.json(history);
    } catch (error) {
        console.error('Query history error:', error);
        res.status(500).json({ error: 'Failed to fetch query history' });
    }
});

/**
 * GET /api/queries/history/all
 * Get all users' query history (superuser only)
 */
app.get('/api/queries/history/all', (req, res) => {
    try {
        const token = auth.extractBearerToken(req.headers.authorization);

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const session = db.getSessionByToken(token);

        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        // Check if user is superuser
        if (!db.isSuperuser(session.email)) {
            return res.status(403).json({ error: 'Superuser access required' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);

        const history = db.getAllQueryHistory(page, limit);

        res.json(history);
    } catch (error) {
        console.error('All query history error:', error);
        res.status(500).json({ error: 'Failed to fetch query history' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'investigate.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n=================================');
    console.log('Investigate Blockchain Explorer Running!');
    console.log('=================================');
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Network: http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});
