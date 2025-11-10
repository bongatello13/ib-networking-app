// seed-templates.js - Run this to add default IB networking templates
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const defaultTemplates = [
  {
    name: 'Initial Coffee Chat Request',
    subject: 'Seeking Career Advice - {{school}} Student',
    body: `Dear {{banker_name}},

I hope this email finds you well. My name is {{your_name}}, and I am a {{year}} at {{school}} studying {{major}}. I came across your profile and was impressed by your experience at {{bank_name}}, particularly your work in {{group}}.

I am very interested in pursuing a career in investment banking and would greatly appreciate the opportunity to learn more about your career path and experiences at {{bank_name}}. Would you be available for a brief 15-20 minute coffee chat or phone call in the coming weeks?

I understand you have a busy schedule, and I would be happy to work around your availability.

Thank you for considering my request, and I look forward to hearing from you.

Best regards,
{{your_name}}
{{school}}
{{email}}`,
    category: 'initial'
  },
  {
    name: 'Follow-up After Coffee Chat',
    subject: 'Thank You - Coffee Chat Follow-up',
    body: `Dear {{banker_name}},

Thank you so much for taking the time to speak with me {{day}}. I really enjoyed learning about your experience at {{bank_name}} and your insights on {{topic_discussed}} were incredibly valuable.

Our conversation reinforced my interest in {{group}} and {{bank_name}}. The advice you shared about {{specific_advice}} was particularly helpful as I prepare for recruiting.

I would love to stay in touch and keep you updated on my progress. Please let me know if there's anything I can do to be helpful to you as well.

Thank you again for your time and guidance.

Best regards,
{{your_name}}`,
    category: 'followup'
  },
  {
    name: 'Informational Interview Request',
    subject: 'Introduction from {{school}} - {{bank_name}} Inquiry',
    body: `Dear {{banker_name}},

I hope this message finds you well. My name is {{your_name}}, and I am currently a {{year}} at {{school}} interested in investment banking. {{referral_name}} suggested I reach out to you given your experience at {{bank_name}}.

I would be grateful for the opportunity to learn more about your career journey and gain insights into {{bank_name}}'s {{group}} group. Would you have 15-20 minutes in the coming weeks for a brief informational interview? I am happy to accommodate your schedule.

Thank you for considering my request.

Best regards,
{{your_name}}
{{school}}
{{email}}`,
    category: 'initial'
  },
  {
    name: 'Alumni Connection',
    subject: 'Fellow {{school}} Alum Seeking Advice',
    body: `Dear {{banker_name}},

I hope you're doing well. My name is {{your_name}}, and I'm a {{year}} at {{school}}, where I understand you also studied. I'm reaching out as a fellow {{school}} alum interested in learning about your career path in investment banking.

I'm particularly interested in {{bank_name}} and the work your team does in {{group}}. As I prepare for recruiting, I would greatly value any advice you could share about your experiences and the industry.

Would you have 15-20 minutes for a quick call in the coming weeks? I'd be happy to work around your schedule.

Thank you for your time, and go {{school_mascot}}!

Best regards,
{{your_name}}
{{school}} '{{grad_year}}`,
    category: 'initial'
  }
];

async function seedTemplates() {
  try {
    console.log('Fetching users...');
    const usersResult = await pool.query('SELECT id, email FROM users LIMIT 10');

    if (usersResult.rows.length === 0) {
      console.log('No users found. Please create a user account first.');
      process.exit(0);
    }

    console.log(`Found ${usersResult.rows.length} user(s)`);

    for (const user of usersResult.rows) {
      console.log(`\nAdding templates for user: ${user.email}`);

      for (const template of defaultTemplates) {
        // Check if template already exists for this user
        const existing = await pool.query(
          'SELECT id FROM templates WHERE user_id = $1 AND name = $2',
          [user.id, template.name]
        );

        if (existing.rows.length > 0) {
          console.log(`  - Skipping "${template.name}" (already exists)`);
          continue;
        }

        await pool.query(
          'INSERT INTO templates (user_id, name, subject, body, category) VALUES ($1, $2, $3, $4, $5)',
          [user.id, template.name, template.subject, template.body, template.category]
        );
        console.log(`  ✓ Added "${template.name}"`);
      }
    }

    console.log('\n✅ Templates seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();
