// server.js
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const multer = require('multer');
const cron = require('node-cron');
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
const allowedOrigins = [
  'http://localhost:3000',
  'https://ib-networking-app.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
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
  // Convert line breaks to <br> tags and wrap paragraphs
  const paragraphs = body.split('\n\n');
  const htmlBody = paragraphs
    .map(p => {
      const lines = p.split('\n').join('<br>');
      return lines ? `<div>${lines}</div>` : '<div><br></div>';
    })
    .join('');

  // Match Gmail's responsive styling
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #222;
    margin: 0;
    padding: 0;
    -webkit-text-size-adjust: 100%;
  }
  @media only screen and (max-width: 600px) {
    body {
      font-size: 16px !important;
    }
  }
</style>
</head>
<body>
${htmlBody}
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
      'https://www.googleapis.com/auth/gmail.readonly', // Required for reading sent emails
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
    const { to, subject, body, templateId, variables, useHtml, attachResume, includeSignature, contactId } = req.body;

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

    // Auto-update contact status if contactId is provided
    if (contactId) {
      const now = new Date().toISOString();
      await supabase
        .from('contacts')
        .update({
          status: 'emailed',
          email_date: now,
          last_contact_date: now,
          updated_at: now
        })
        .eq('id', contactId)
        .eq('user_id', req.user.id);

      // Create timeline note for the email
      await supabase
        .from('timeline_notes')
        .insert([{
          contact_id: parseInt(contactId),
          user_id: req.user.id,
          type: 'email',
          content: `Email sent: ${finalSubject}`
        }]);
    }

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

// Get email threads for a specific contact
app.get('/api/contacts/:id/emails', authenticateToken, async (req, res) => {
  try {
    // Get contact to find their email
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('email')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.json({ emails: [], contact: contact.email });
    }

    // Get user's Gmail tokens
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('gmail_refresh_token, gmail_access_token')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(500).json({ error: 'Failed to retrieve user data' });
    }

    if (!user.gmail_refresh_token && !user.gmail_access_token) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Set credentials
    oauth2Client.setCredentials({
      refresh_token: user.gmail_refresh_token,
      access_token: user.gmail_access_token
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch sent emails to this contact
    const { data: sentEmails } = await supabase
      .from('sent_emails')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('recipient', contact.email)
      .order('sent_at', { ascending: false });

    // Fetch received emails from Gmail
    const receivedEmails = [];

    try {
      // Search for emails from this contact
      const searchQuery = `from:${contact.email}`;
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 50 // Limit to most recent 50
      });

      if (listResponse.data.messages) {
        // Fetch full details for each message
        for (const message of listResponse.data.messages) {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });

          const headers = fullMessage.data.payload.headers;
          const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const date = headers.find(h => h.name === 'Date')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';

          // Get email body
          let body = '';
          if (fullMessage.data.payload.parts) {
            const textPart = fullMessage.data.payload.parts.find(
              part => part.mimeType === 'text/plain'
            );
            if (textPart && textPart.body.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
          } else if (fullMessage.data.payload.body.data) {
            body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
          }

          receivedEmails.push({
            id: message.id,
            subject,
            from,
            to,
            date: new Date(date).toISOString(),
            body: body.substring(0, 500), // Limit body preview
            snippet: fullMessage.data.snippet
          });
        }
      }
    } catch (gmailError) {
      console.error('Error fetching Gmail messages:', gmailError);
      // Continue without received emails if Gmail fetch fails
    }

    // Combine and sort by date
    const allEmails = [
      ...sentEmails.map(e => ({
        ...e,
        type: 'sent',
        date: e.sent_at
      })),
      ...receivedEmails.map(e => ({
        ...e,
        type: 'received',
        date: e.date
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      emails: allEmails,
      contact: contact.email
    });
  } catch (error) {
    console.error('[EMAIL THREADS] Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// ============ SCHEDULED EMAILS ENDPOINTS ============

// Schedule an email to be sent later
app.post('/api/emails/schedule', authenticateToken, async (req, res) => {
  try {
    const { to, subject, body, scheduledFor, templateId, variables, attachResume, includeSignature, contactId } = req.body;

    // Validate input
    if (!to || !subject || !body || !scheduledFor) {
      return res.status(400).json({ error: 'To, subject, body, and scheduledFor are required' });
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledFor);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }

    // Insert scheduled email
    const { data: scheduledEmail, error: insertError } = await supabase
      .from('scheduled_emails')
      .insert([{
        user_id: req.user.id,
        to_email: to,
        subject,
        body,
        scheduled_for: scheduledFor,
        template_id: templateId || null,
        variables: variables || {},
        attach_resume: attachResume || false,
        include_signature: includeSignature !== false,
        contact_id: contactId || null,
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({
      success: true,
      message: 'Email scheduled successfully',
      scheduledEmail
    });
  } catch (error) {
    console.error('Schedule email error:', error);
    res.status(500).json({ error: 'Failed to schedule email', details: error.message });
  }
});

// Get all scheduled emails for user
app.get('/api/emails/scheduled', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('scheduled_emails')
      .select('*')
      .eq('user_id', req.user.id)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: scheduledEmails, error: queryError } = await query;

    if (queryError) throw queryError;

    res.json(scheduledEmails);
  } catch (error) {
    console.error('Get scheduled emails error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel a scheduled email
app.delete('/api/emails/scheduled/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if email exists and is pending
    const { data: scheduledEmail, error: checkError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (checkError || !scheduledEmail) {
      return res.status(404).json({ error: 'Scheduled email not found' });
    }

    if (scheduledEmail.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending emails' });
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('scheduled_emails')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Scheduled email cancelled' });
  } catch (error) {
    console.error('Cancel scheduled email error:', error);
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

// ============ COMPANIES ENDPOINTS ============

// Get all companies for user (with contact counts)
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const { data: companies, error: queryError } = await supabase
      .from('companies')
      .select(`
        *,
        contacts:contacts(count)
      `)
      .eq('user_id', req.user.id)
      .order('ranking', { ascending: true })
      .order('name', { ascending: true });

    if (queryError) throw queryError;

    // Format response with contact count
    const formattedCompanies = companies.map(company => ({
      ...company,
      contact_count: company.contacts[0]?.count || 0,
      contacts: undefined // Remove nested contacts object
    }));

    res.json(formattedCompanies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single company with all contacts
app.get('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { data: company, error: queryError } = await supabase
      .from('companies')
      .select(`
        *,
        contacts (
          id, name, email, phone, position, status, quality, tags,
          email_date, phone_date, last_contact_date, next_followup_date,
          created_at, updated_at
        )
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (queryError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create company
app.post('/api/companies', authenticateToken, async (req, res) => {
  try {
    const { name, ranking, industry, sector, results_progress, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const { data: company, error: insertError } = await supabase
      .from('companies')
      .insert([{
        user_id: req.user.id,
        name,
        ranking: ranking || 'Target',
        industry: industry || null,
        sector: sector || null,
        results_progress: results_progress || null,
        notes: notes || null
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json(company);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update company
app.put('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { name, ranking, industry, sector, results_progress, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const { data: company, error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        ranking: ranking || 'Target',
        industry: industry || null,
        sector: sector || null,
        results_progress: results_progress || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete company
app.delete('/api/companies/:id', authenticateToken, async (req, res) => {
  try {
    const { error: deleteError } = await supabase
      .from('companies')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ CONTACTS ENDPOINTS ============

// Get all contacts for user (with optional filtering)
app.get('/api/contacts', authenticateToken, async (req, res) => {
  try {
    const { status, quality, company_id, tags } = req.query;

    let query = supabase
      .from('contacts')
      .select(`
        id, name, email, phone, linkedin, company, position, company_id,
        group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
        email_date, phone_date, last_contact_date, next_followup_date,
        created_at, updated_at,
        companies:company_id (id, name, ranking)
      `)
      .eq('user_id', req.user.id);

    // Apply filters if provided
    if (status) {
      query = query.eq('status', status);
    }
    if (quality) {
      query = query.eq('quality', quality);
    }
    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    if (tags) {
      // Filter by tags array overlap
      const tagArray = tags.split(',');
      query = query.overlaps('tags', tagArray);
    }

    query = query.order('updated_at', { ascending: false });

    const { data: contacts, error: queryError } = await query;

    if (queryError) throw queryError;

    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single contact (with timeline notes)
app.get('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const { data: contact, error: queryError } = await supabase
      .from('contacts')
      .select(`
        id, name, email, phone, linkedin, company, position, company_id,
        group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
        email_date, phone_date, last_contact_date, next_followup_date,
        email_history, created_at, updated_at,
        companies:company_id (id, name, ranking),
        timeline_notes (id, type, content, created_at)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (queryError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Sort timeline notes by date (newest first)
    if (contact.timeline_notes) {
      contact.timeline_notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
    const {
      name, email, phone, linkedin, company, position, company_id,
      group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
      next_followup_date, initial_note, email_date, phone_date
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const { data: contact, error: insertError } = await supabase
      .from('contacts')
      .insert([{
        user_id: req.user.id,
        name,
        email: email || null,
        phone: phone || null,
        linkedin: linkedin || null,
        company: company || null,
        position: position || null,
        company_id: company_id || null,
        group_affiliation: group_affiliation || null,
        timeline: timeline || null,
        notes: notes || null,
        email_notes: email_notes || null,
        call_notes: call_notes || null,
        status: status || 'none',
        quality: quality || null,
        tags: tags || [],
        email_date: email_date || null,
        phone_date: phone_date || null,
        next_followup_date: next_followup_date || null
      }])
      .select(`
        id, name, email, phone, linkedin, company, position, company_id,
        group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
        email_date, phone_date, last_contact_date, next_followup_date,
        created_at, updated_at
      `)
      .single();

    if (insertError) throw insertError;

    // If initial note provided, create timeline note
    if (initial_note && initial_note.trim()) {
      await supabase
        .from('timeline_notes')
        .insert([{
          contact_id: contact.id,
          user_id: req.user.id,
          type: 'general',
          content: initial_note
        }]);
    }

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update contact
app.put('/api/contacts/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name, email, phone, linkedin, company, position, company_id,
      group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
      email_date, phone_date, last_contact_date, next_followup_date
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updateData = {
      name,
      email: email || null,
      phone: phone || null,
      linkedin: linkedin || null,
      company: company || null,
      position: position || null,
      company_id: company_id || null,
      group_affiliation: group_affiliation || null,
      timeline: timeline || null,
      notes: notes || null,
      email_notes: email_notes || null,
      call_notes: call_notes || null,
      status: status || 'none',
      quality: quality || null,
      tags: tags || [],
      updated_at: new Date().toISOString()
    };

    // Only update date fields if provided
    if (email_date !== undefined) updateData.email_date = email_date;
    if (phone_date !== undefined) updateData.phone_date = phone_date;
    if (last_contact_date !== undefined) updateData.last_contact_date = last_contact_date;
    if (next_followup_date !== undefined) updateData.next_followup_date = next_followup_date;

    const { data: contact, error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select(`
        id, name, email, phone, linkedin, company, position, company_id,
        group_affiliation, timeline, notes, email_notes, call_notes, status, quality, tags,
        email_date, phone_date, last_contact_date, next_followup_date,
        created_at, updated_at
      `)
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

// Update contact status (manual override)
app.put('/api/contacts/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['none', 'emailed', 'called'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const now = new Date().toISOString();
    const updateData = {
      status,
      updated_at: now
    };

    // Auto-set dates based on status
    if (status === 'emailed') {
      updateData.email_date = now;
      updateData.last_contact_date = now;
    } else if (status === 'called') {
      updateData.phone_date = now;
      updateData.last_contact_date = now;
    }

    const { data: contact, error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(contact);
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Log phone call for contact
app.post('/api/contacts/:id/call', authenticateToken, async (req, res) => {
  try {
    const { duration, quality, note, next_followup_date } = req.body;

    const now = new Date().toISOString();

    // Update contact
    const updateData = {
      status: 'called',
      phone_date: now,
      last_contact_date: now,
      updated_at: now
    };

    if (quality) updateData.quality = quality;
    if (next_followup_date) updateData.next_followup_date = next_followup_date;

    const { data: contact, error: updateError } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Create timeline note
    const noteContent = duration
      ? `Phone call (${duration} min)${note ? ': ' + note : ''}`
      : note || 'Phone call';

    await supabase
      .from('timeline_notes')
      .insert([{
        contact_id: parseInt(req.params.id),
        user_id: req.user.id,
        type: 'call',
        content: noteContent
      }]);

    res.json(contact);
  } catch (error) {
    console.error('Log call error:', error);
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

// ============ TIMELINE NOTES ENDPOINTS ============

// Get timeline notes for a contact
app.get('/api/contacts/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { data: notes, error: queryError } = await supabase
      .from('timeline_notes')
      .select('*')
      .eq('contact_id', req.params.id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (queryError) throw queryError;

    res.json(notes);
  } catch (error) {
    console.error('Get timeline notes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add timeline note to contact
app.post('/api/contacts/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { type, content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    if (type && !['email', 'call', 'meeting', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid note type' });
    }

    const { data: note, error: insertError } = await supabase
      .from('timeline_notes')
      .insert([{
        contact_id: parseInt(req.params.id),
        user_id: req.user.id,
        type: type || 'general',
        content
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // Update contact's last_contact_date
    await supabase
      .from('contacts')
      .update({
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    res.status(201).json(note);
  } catch (error) {
    console.error('Create timeline note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update timeline note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const { data: note, error: updateError } = await supabase
      .from('timeline_notes')
      .update({ content })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (updateError || !note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Update timeline note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete timeline note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    const { error: deleteError } = await supabase
      .from('timeline_notes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete timeline note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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

// ==================== SCHEDULED EMAIL CRON JOB ====================

// Function to process and send scheduled emails
async function processScheduledEmails() {
  try {
    console.log('Checking for scheduled emails to send...');

    // Get all pending scheduled emails that are due
    const { data: scheduledEmails, error: queryError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (queryError) {
      console.error('Error querying scheduled emails:', queryError);
      return;
    }

    if (!scheduledEmails || scheduledEmails.length === 0) {
      console.log('No scheduled emails to send');
      return;
    }

    console.log(`Found ${scheduledEmails.length} scheduled email(s) to send`);

    // Process each scheduled email
    for (const scheduledEmail of scheduledEmails) {
      try {
        // Mark as sending (in case of concurrent runs)
        const { error: updateError } = await supabase
          .from('scheduled_emails')
          .update({ status: 'sending' })
          .eq('id', scheduledEmail.id)
          .eq('status', 'pending'); // Only update if still pending

        if (updateError) {
          console.error(`Error updating scheduled email ${scheduledEmail.id}:`, updateError);
          continue;
        }

        // Get user's Gmail credentials
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('gmail_access_token, gmail_refresh_token')
          .eq('id', scheduledEmail.user_id)
          .single();

        if (userError || !user || !user.gmail_access_token) {
          throw new Error('User Gmail credentials not found');
        }

        // Set OAuth2 credentials
        oauth2Client.setCredentials({
          access_token: user.gmail_access_token,
          refresh_token: user.gmail_refresh_token
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build email body with variables filled in
        let emailSubject = scheduledEmail.subject;
        let emailBody = scheduledEmail.body;

        if (scheduledEmail.variables) {
          Object.entries(scheduledEmail.variables).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            emailSubject = emailSubject.replace(regex, value);
            emailBody = emailBody.replace(regex, value);
          });
        }

        // Add signature if requested
        if (scheduledEmail.include_signature) {
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('gmail_signature')
              .eq('id', scheduledEmail.user_id)
              .single();

            if (userData?.gmail_signature) {
              emailBody += '\n\n' + userData.gmail_signature;
            }
          } catch (sigError) {
            console.error('Error fetching signature:', sigError);
          }
        }

        // Prepare email message
        const messageParts = [
          `To: ${scheduledEmail.to_email}`,
          `Subject: ${emailSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          '',
          emailBody
        ];

        const message = messageParts.join('\n');
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

        // Mark as sent
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', scheduledEmail.id);

        // Update contact status if contact_id is present
        if (scheduledEmail.contact_id) {
          try {
            const { data: contact } = await supabase
              .from('contacts')
              .select('status')
              .eq('id', scheduledEmail.contact_id)
              .single();

            if (contact && contact.status === 'none') {
              await supabase
                .from('contacts')
                .update({ status: 'emailed' })
                .eq('id', scheduledEmail.contact_id);
            }
          } catch (contactError) {
            console.error('Error updating contact status:', contactError);
          }
        }

        console.log(`Successfully sent scheduled email ${scheduledEmail.id} to ${scheduledEmail.to_email}`);

      } catch (emailError) {
        console.error(`Error sending scheduled email ${scheduledEmail.id}:`, emailError);

        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error_message: emailError.message || 'Unknown error'
          })
          .eq('id', scheduledEmail.id);
      }
    }

  } catch (error) {
    console.error('Error processing scheduled emails:', error);
  }
}

// Run cron job every minute to check for scheduled emails
cron.schedule('* * * * *', () => {
  processScheduledEmails();
});

console.log('Scheduled email cron job initialized (runs every minute)');
