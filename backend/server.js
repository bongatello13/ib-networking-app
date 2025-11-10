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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// Helper function to extract variables from template
const extractVariables = (text) => {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
};

// Helper function to fill template variables
const fillTemplate = (template, variables) => {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
};

// Helper function to create HTML email from plain text
const createHtmlEmail = (body) => {
  // Convert line breaks to <br> tags and wrap in basic HTML structure
  const htmlBody = body
    .split('\n')
    .map(line => line.trim())
    .join('<br>\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${htmlBody}
</body>
</html>
`.trim();
};

// ==================== AUTH ROUTES ====================

// Sign up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hashedPassword, name || null]
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

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
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, gmail_refresh_token FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      gmailConnected: !!user.gmail_refresh_token
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== GMAIL OAUTH ROUTES ====================

// Get Gmail authorization URL
app.get('/api/gmail/auth-url', authenticateToken, (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state: req.user.id.toString(),
    prompt: 'consent' // Force consent screen to get refresh token
  });
  res.json({ authUrl });
});

// Gmail OAuth callback
app.get('/api/gmail/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;

    if (!code) {
      return res.status(400).send('<html><body><h1>Error: No authorization code received</h1></body></html>');
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Get user's Gmail address
    const tempAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    tempAuth.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: tempAuth });
    const userInfo = await oauth2.userinfo.get();
    const gmailAddress = userInfo.data.email;

    // Save tokens to database
    await pool.query(
      'UPDATE users SET gmail_refresh_token = $1, gmail_access_token = $2, gmail_address = $3 WHERE id = $4',
      [tokens.refresh_token || null, tokens.access_token, gmailAddress, userId]
    );

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Connected</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .container { text-align: center; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { color: #4CAF50; margin-bottom: 10px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✓ Gmail Connected Successfully!</h1>
          <p>Connected: ${gmailAddress}</p>
          <p>You can close this window and return to the app.</p>
        </div>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1 style="color: #f44336;">Error Connecting Gmail</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

// Check Gmail connection status
app.get('/api/gmail/status', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT gmail_refresh_token, gmail_address FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    const connected = !!user?.gmail_refresh_token;
    res.json({
      connected,
      gmailAddress: connected ? user.gmail_address : null
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Disconnect Gmail
app.post('/api/gmail/disconnect', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET gmail_refresh_token = NULL, gmail_access_token = NULL, gmail_address = NULL WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
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

    // Add extracted variables to each template
    const templatesWithVariables = result.rows.map(template => ({
      ...template,
      variables: extractVariables(template.subject + ' ' + template.body)
    }));

    res.json(templatesWithVariables);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single template
app.get('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result.rows[0];
    res.json({
      ...template,
      variables: extractVariables(template.subject + ' ' + template.body)
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create template
app.post('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { name, subject, body, category } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Name, subject, and body are required' });
    }

    const result = await pool.query(
      'INSERT INTO templates (user_id, name, subject, body, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, subject, body, category || 'general']
    );

    const template = result.rows[0];
    res.json({
      ...template,
      variables: extractVariables(template.subject + ' ' + template.body)
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update template
app.put('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body, category } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'Name, subject, and body are required' });
    }

    const result = await pool.query(
      'UPDATE templates SET name = $1, subject = $2, body = $3, category = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 AND user_id = $6 RETURNING *',
      [name, subject, body, category || 'general', id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result.rows[0];
    res.json({
      ...template,
      variables: extractVariables(template.subject + ' ' + template.body)
    });
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
    const { to, subject, body, templateId, variables, useHtml } = req.body;

    // Validate input
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    // Get user's Gmail tokens
    const userResult = await pool.query(
      'SELECT gmail_refresh_token, gmail_access_token FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];
    if (!user.gmail_refresh_token && !user.gmail_access_token) {
      return res.status(400).json({ error: 'Gmail not connected. Please connect your Gmail account first.' });
    }

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: user.gmail_refresh_token,
      access_token: user.gmail_access_token
    });

    // Create Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fill template variables if provided
    let finalSubject = subject;
    let finalBody = body;

    if (variables && Object.keys(variables).length > 0) {
      finalSubject = fillTemplate(subject, variables);
      finalBody = fillTemplate(body, variables);
    }

    // Create email message
    let message;
    if (useHtml) {
      const htmlContent = createHtmlEmail(finalBody);
      message = [
        'Content-Type: text/html; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `To: ${to}\n`,
        `Subject: ${finalSubject}\n\n`,
        htmlContent
      ].join('');
    } else {
      message = [
        'Content-Type: text/plain; charset="UTF-8"\n',
        'MIME-Version: 1.0\n',
        'Content-Transfer-Encoding: 7bit\n',
        `To: ${to}\n`,
        `Subject: ${finalSubject}\n\n`,
        finalBody
      ].join('');
    }

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    // Save to sent emails
    const sentResult = await pool.query(
      'INSERT INTO sent_emails (user_id, template_id, recipient, subject, body, variables_used) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.id, templateId || null, to, finalSubject, finalBody, JSON.stringify(variables || {})]
    );

    res.json({
      success: true,
      message: 'Email sent successfully',
      sentEmail: sentResult.rows[0],
      messageId: sendResult.data.id
    });
  } catch (error) {
    console.error('Send email error:', error);

    // Check if it's a token refresh error
    if (error.code === 401 || error.message?.includes('invalid_grant')) {
      return res.status(401).json({
        error: 'Gmail authorization expired. Please reconnect your Gmail account.',
        needsReauth: true
      });
    }

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
       ORDER BY se.sent_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get email statistics
app.get('/api/emails/stats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_sent,
        COUNT(DISTINCT recipient) as unique_recipients,
        DATE(sent_at) as date,
        COUNT(*) as count
       FROM sent_emails
       WHERE user_id = $1
       AND sent_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(sent_at)
       ORDER BY date DESC`,
      [req.user.id]
    );

    const totalResult = await pool.query(
      `SELECT
        COUNT(*) as total_sent,
        COUNT(DISTINCT recipient) as unique_recipients
       FROM sent_emails
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      totalSent: parseInt(totalResult.rows[0]?.total_sent || 0),
      uniqueRecipients: parseInt(totalResult.rows[0]?.unique_recipients || 0),
      recentActivity: result.rows
    });
  } catch (error) {
    console.error('Get email stats error:', error);
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
        name VARCHAR(255),
        gmail_refresh_token TEXT,
        gmail_access_token TEXT,
        gmail_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
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
        variables_used JSONB,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
      CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, async () => {
  await initDatabase();
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
