// server.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

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
  // Convert line breaks to <br> tags - preserve exact formatting, no indentation
  const htmlBody = body
    .split('\n')
    .join('<br>');

  // Match Gmail's exact styling from inspected element
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 19.5px; color: rgb(34, 34, 34); direction: ltr; margin: 0; padding: 0;">
<div>
${htmlBody}
</div>
</body>
</html>`;
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
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, name: name || null }])
      .select('id, email, name')
      .single();

    if (insertError) {
      throw insertError;
    }

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
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError || !user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

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
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('id, email, name, gmail_refresh_token')
      .eq('id', req.user.id)
      .single();

    if (queryError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
      'https://www.googleapis.com/auth/gmail.settings.basic',
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
    await supabase
      .from('users')
      .update({
        gmail_refresh_token: tokens.refresh_token || null,
        gmail_access_token: tokens.access_token,
        gmail_address: gmailAddress
      })
      .eq('id', userId);

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
    const { data: user } = await supabase
      .from('users')
      .select('gmail_refresh_token, gmail_address')
      .eq('id', req.user.id)
      .single();

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
    await supabase
      .from('users')
      .update({
        gmail_refresh_token: null,
        gmail_access_token: null,
        gmail_address: null
      })
      .eq('id', req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current signature
app.get('/api/gmail/signature', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('signature_text, signature_html, signature_updated_at')
      .eq('id', req.user.id)
      .single();

    res.json({
      text: user?.signature_text || '',
      html: user?.signature_html || '',
      updatedAt: user?.signature_updated_at || null
    });
  } catch (error) {
    console.error('Get signature error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Save/update signature - saves to database and syncs to Gmail
app.post('/api/gmail/signature', authenticateToken, async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature || !signature.trim()) {
      return res.status(400).json({ error: 'Signature text is required' });
    }

    // Get user's Gmail tokens
    const { data: user } = await supabase
      .from('users')
      .select('gmail_refresh_token, gmail_access_token, gmail_address')
      .eq('id', req.user.id)
      .single();

    if (!user?.gmail_refresh_token) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Convert plain text to HTML with proper line breaks
    const htmlSignature = signature.split('\n').join('<br>');

    // Set up OAuth2 client
    const userAuth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    userAuth.setCredentials({
      refresh_token: user.gmail_refresh_token,
      access_token: user.gmail_access_token
    });

    // Get Gmail API client
    const gmail = google.gmail({ version: 'v1', auth: userAuth });

    // Update signature in Gmail
    await gmail.users.settings.sendAs.patch({
      userId: 'me',
      sendAsEmail: user.gmail_address,
      requestBody: {
        signature: htmlSignature
      }
    });

    // Save to database
    await supabase
      .from('users')
      .update({
        signature_text: signature,
        signature_html: htmlSignature,
        signature_updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    res.json({
      success: true,
      text: signature,
      html: htmlSignature,
      updatedAt: new Date().toISOString(),
      message: 'Signature saved and synced to Gmail successfully'
    });
  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({ error: 'Failed to save signature: ' + error.message });
  }
});

// ==================== TEMPLATE ROUTES ====================

// Get all templates
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    const { data: templates, error: queryError } = await supabase
      .from('templates')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    // Add extracted variables to each template
    const templatesWithVariables = templates.map(template => ({
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
    const { data: template, error: queryError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (queryError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

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

    const { data: template, error: insertError } = await supabase
      .from('templates')
      .insert([{
        user_id: req.user.id,
        name,
        subject,
        body,
        category: category || 'general'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

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

    const { data: template, error: updateError } = await supabase
      .from('templates')
      .update({
        name,
        subject,
        body,
        category: category || 'general',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

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
    const { error: deleteError } = await supabase
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
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
    const { to, subject, body, templateId, variables, useHtml, attachResume, includeSignature } = req.body;

    // Validate input
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'To, subject, and body are required' });
    }

    // Get user's Gmail tokens, resume, and signature
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('gmail_refresh_token, gmail_access_token, resume_filename, resume_data, resume_mimetype, signature_html')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return res.status(500).json({ error: 'Failed to retrieve user data' });
    }

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

    // Append signature if available and user wants it included
    if (includeSignature !== false && user.signature_html) {
      // Add two line breaks before the signature for proper spacing
      finalBody = finalBody + '\n\n' + user.signature_html;
    }

    // Create email message with or without attachment
    let message;
    const boundary = '----=_Part_' + Date.now();

    if (attachResume && user.resume_data) {
      // Create multipart message with attachment
      const htmlContent = useHtml ? createHtmlEmail(finalBody) : finalBody;
      const contentType = useHtml ? 'text/html' : 'text/plain';

      const messageParts = [
        `MIME-Version: 1.0`,
        `To: ${to}`,
        `Subject: ${finalSubject}`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        `Content-Type: ${contentType}; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        htmlContent,
        '',
        `--${boundary}`,
        `Content-Type: ${user.resume_mimetype}; name="${user.resume_filename}"`,
        `Content-Disposition: attachment; filename="${user.resume_filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        user.resume_data.toString('base64'),
        '',
        `--${boundary}--`
      ];

      message = messageParts.join('\r\n');
    } else {
      // Simple message without attachment
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
    const { data: sentEmail } = await supabase
      .from('sent_emails')
      .insert([{
        user_id: req.user.id,
        template_id: templateId || null,
        recipient: to,
        subject: finalSubject,
        body: finalBody,
        variables_used: variables || {},
        has_attachment: attachResume && !!user.resume_data
      }])
      .select()
      .single();

    res.json({
      success: true,
      message: 'Email sent successfully',
      sentEmail: sentEmail,
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
    const { data: sentEmails, error: queryError } = await supabase
      .from('sent_emails')
      .select(`
        *,
        templates:template_id (name)
      `)
      .eq('user_id', req.user.id)
      .order('sent_at', { ascending: false })
      .limit(100);

    if (queryError) throw queryError;

    // Flatten the nested template name
    const formattedEmails = sentEmails.map(email => ({
      ...email,
      template_name: email.templates?.name || null,
      templates: undefined
    }));

    res.json(formattedEmails);
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get email statistics
app.get('/api/emails/stats', authenticateToken, async (req, res) => {
  try {
    // Get total stats
    const { data: allEmails } = await supabase
      .from('sent_emails')
      .select('recipient')
      .eq('user_id', req.user.id);

    const totalSent = allEmails?.length || 0;
    const uniqueRecipients = new Set(allEmails?.map(e => e.recipient)).size;

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentEmails } = await supabase
      .from('sent_emails')
      .select('sent_at')
      .eq('user_id', req.user.id)
      .gte('sent_at', thirtyDaysAgo.toISOString());

    // Group by date
    const activityByDate = {};
    recentEmails?.forEach(email => {
      const date = email.sent_at.split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const recentActivity = Object.entries(activityByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      totalSent,
      uniqueRecipients,
      recentActivity
    });
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DATABASE INITIALIZATION ====================
// Note: Database tables are managed by Supabase.
// Run the supabase-migration.sql script in your Supabase SQL Editor to set up the schema.

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ CONTACTS ENDPOINTS ============

// Get all contacts for user
app.get('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const { data: contacts, error: queryError } = await supabase
      .from('contacts')
      .select('id, name, email, linkedin, company, position, group_affiliation, timeline, notes, status, created_at, updated_at')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (queryError) throw queryError;

    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single contact
app.get('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { data: contact, error: queryError } = await supabase
      .from('contacts')
      .select('id, name, email, linkedin, company, position, group_affiliation, timeline, notes, status, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (queryError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create contact
app.post('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const { name, email, linkedin, company, position, group_affiliation, timeline, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: contact, error: insertError } = await supabase
      .from('contacts')
      .insert([{
        user_id: req.user.id,
        name,
        email: email || null,
        linkedin: linkedin || null,
        company: company || null,
        position: position || null,
        group_affiliation: group_affiliation || null,
        timeline: timeline || null,
        notes: notes || null,
        status: status || 'not_contacted'
      }])
      .select('id, name, email, linkedin, company, position, group_affiliation, timeline, notes, status, created_at, updated_at')
      .single();

    if (insertError) throw insertError;

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update contact
app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { name, email, linkedin, company, position, group_affiliation, timeline, notes, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: contact, error: updateError } = await supabase
      .from('contacts')
      .update({
        name,
        email: email || null,
        linkedin: linkedin || null,
        company: company || null,
        position: position || null,
        group_affiliation: group_affiliation || null,
        timeline: timeline || null,
        notes: notes || null,
        status: status || 'not_contacted',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select('id, name, email, linkedin, company, position, group_affiliation, timeline, notes, status, created_at, updated_at')
      .single();

    if (updateError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete contact
app.delete('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { error: deleteError } = await supabase
      .from('contacts')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? '✓ Configured' : '✗ Not configured'}`);
});

// ==================== RESUME ROUTES ====================

// Upload resume
app.post('/api/resume/upload', authenticateToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, buffer, mimetype } = req.file;

    // Save resume to database (Note: For large files, consider using Supabase Storage instead)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        resume_filename: originalname,
        resume_data: buffer,
        resume_mimetype: mimetype,
        resume_uploaded_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({
      success: true,
      filename: originalname,
      size: buffer.length,
      uploadedAt: new Date()
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
});

// Get resume info
app.get('/api/resume/info', authenticateToken, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('resume_filename, resume_mimetype, resume_uploaded_at, resume_data')
      .eq('id', req.user.id)
      .single();

    if (!user || !user.resume_filename) {
      return res.json({ hasResume: false });
    }

    res.json({
      hasResume: true,
      filename: user.resume_filename,
      mimetype: user.resume_mimetype,
      size: user.resume_data ? Buffer.from(user.resume_data).length : 0,
      uploadedAt: user.resume_uploaded_at
    });
  } catch (error) {
    console.error('Get resume info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete resume
app.delete('/api/resume', authenticateToken, async (req, res) => {
  try {
    const { error: updateError } = await supabase
      .from('users')
      .update({
        resume_filename: null,
        resume_data: null,
        resume_mimetype: null,
        resume_uploaded_at: null
      })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
