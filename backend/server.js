// server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Gmail OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ user, token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id: user.id, email: user.email },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GMAIL OAUTH ROUTES ====================

// Get Gmail authorization URL
app.get('/api/gmail/auth-url', authenticateToken, (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
    state: req.user.id.toString()
  });
  res.json({ authUrl });
});

// Gmail OAuth callback
app.get('/api/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to database
    await pool.query(
      'UPDATE users SET gmail_refresh_token = $1, gmail_access_token = $2 WHERE id = $3',
      [tokens.refresh_token, tokens.access_token, userId]
    );

    res.send('<html><body><h1>Gmail connected successfully!</h1><p>You can close this window.</p></body></html>');
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.status(500).send('Error connecting Gmail');
  }
});

// Check Gmail connection status
app.get('/api/gmail/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT gmail_refresh_token FROM users WHERE id = $1',
      [req.user.id]
    );
    const connected = !!result.rows[0]?.gmail_refresh_token;
    res.json({ connected });
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== TEMPLATE ROUTES ====================

// Get all templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM templates WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create template
app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    const result = await pool.query(
      'INSERT INTO templates (user_id, name, subject, body) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, subject, body]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update template
app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;

    const result = await pool.query(
      'UPDATE templates SET name = $1, subject = $2, body = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, subject, body, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete template
app.delete('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM templates WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== EMAIL ROUTES ====================

// Send email
app.post('/api/emails/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, body, templateId } = req.body;

    // Get user's Gmail tokens
    const userResult = await pool.query(
      'SELECT gmail_refresh_token, gmail_access_token FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];
    if (!user.gmail_refresh_token) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Gmail account first.' });
    }

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: user.gmail_refresh_token,
      access_token: user.gmail_access_token
    });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email message
    const message = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `To: ${to}\n`,
      `Subject: ${subject}\n\n`,
      body
    ].join('');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    // Save to sent emails
    const sentResult = await pool.query(
      'INSERT INTO sent_emails (user_id, template_id, recipient, subject, body) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, templateId, to, subject, body]
    );

    res.json({
      success: true,
      message: 'Email sent successfully',
      sentEmail: sentResult.rows[0]
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Get sent emails
app.get('/api/emails/sent', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT se.*, t.name as template_name 
       FROM sent_emails se 
       LEFT JOIN templates t ON se.template_id = t.id 
       WHERE se.user_id = $1 
       ORDER BY se.sent_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DATABASE INITIALIZATION ====================

const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        gmail_refresh_token TEXT,
        gmail_access_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sent_emails (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        template_id INTEGER REFERENCES templates(id) ON DELETE SET NULL,
        recipient VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Start server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server running on port ${PORT}`);
});