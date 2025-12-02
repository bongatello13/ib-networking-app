import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { emailsAPI } from '../api/emails';
import { templatesAPI } from '../api/templates';
import { resumeAPI } from '../api/resume';
import { gmailAPI } from '../api/gmail';
import { contactsAPI } from '../api/contacts';

function Compose() {
  const location = useLocation();
  const navigate = useNavigate();
  const templateFromState = location.state?.template;

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState({});
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [attachResume, setAttachResume] = useState(false);
  const [resumeInfo, setResumeInfo] = useState(null);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [signatureInfo, setSignatureInfo] = useState(null);
  const [showContactNotes, setShowContactNotes] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  useEffect(() => {
    loadTemplates();
    loadContacts();
    loadResumeInfo();
    loadSignatureInfo();
    if (templateFromState) {
      loadTemplate(templateFromState);
    }
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templatesAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await contactsAPI.getAll();
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadResumeInfo = async () => {
    try {
      const data = await resumeAPI.getInfo();
      // Only set resumeInfo if hasResume is true
      setResumeInfo(data.hasResume ? data : null);
    } catch (error) {
      console.error('Error loading resume info:', error);
      setResumeInfo(null);
    }
  };

  const loadSignatureInfo = async () => {
    try {
      const data = await gmailAPI.getSignature();
      setSignatureInfo(data);
    } catch (error) {
      console.error('Error loading signature info:', error);
    }
  };

  const loadTemplate = (template) => {
    console.log('Loading template:', template);
    console.log('Template variables:', template.variables);
    setSelectedTemplate(template);
    setSubject(template.subject);
    setBody(template.body);

    // Initialize variables
    const vars = {};
    template.variables?.forEach(v => {
      vars[v] = '';
    });
    setVariables(vars);
  };

  const handleTemplateChange = async (templateId) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setSubject('');
      setBody('');
      setVariables({});
      return;
    }

    try {
      const template = await templatesAPI.getOne(templateId);
      loadTemplate(template);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  const handleContactChange = (contactId) => {
    if (!contactId) {
      setSelectedContact(null);
      setShowContactNotes(false);
      return;
    }

    const contact = contacts.find(c => c.id === parseInt(contactId));
    if (contact) {
      setSelectedContact(contact);
      setTo(contact.email || '');
      setShowContactNotes(true);
    }
  };

  const fillTemplate = (text, vars) => {
    let result = text;
    Object.entries(vars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || `{{${key}}}`);
    });
    return result;
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate scheduled time if scheduling
    if (scheduleEmail) {
      if (!scheduledDateTime) {
        setError('Please select a date and time for scheduling');
        return;
      }
      const scheduledDate = new Date(scheduledDateTime);
      if (scheduledDate <= new Date()) {
        setError('Scheduled time must be in the future');
        return;
      }
    }

    setSending(true);

    try {
      if (scheduleEmail) {
        // Schedule email
        await emailsAPI.schedule({
          to,
          subject,
          body,
          scheduledFor: scheduledDateTime,
          templateId: selectedTemplate?.id,
          variables,
          attachResume: attachResume,
          includeSignature: includeSignature,
          contactId: selectedContact?.id
        });
        setSuccess('Email scheduled successfully!');
      } else {
        // Send immediately
        await emailsAPI.send({
          to,
          subject,
          body,
          templateId: selectedTemplate?.id,
          variables,
          useHtml: true,
          attachResume: attachResume,
          includeSignature: includeSignature,
          contactId: selectedContact?.id
        });
        setSuccess('Email sent successfully!');
      }

      // Reset form
      setTimeout(() => {
        setTo('');
        setSubject('');
        setBody('');
        setVariables({});
        setSelectedTemplate(null);
        setAttachResume(false);
        setScheduleEmail(false);
        setScheduledDateTime('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const previewSubject = fillTemplate(subject, variables);
  const previewBody = fillTemplate(body, variables);

  return (
    <Layout>
      <div className="page-header">
        <h1>Compose Email</h1>
        <p>Send personalized emails to investment bankers</p>
      </div>

      <div className="compose-form">
        {success && <div className="success">{success}</div>}
        {error && <div className="error">{error}</div>}

        <div className="card">
          <form onSubmit={handleSend}>
            <div className="form-group">
              <label>Select Contact (Optional)</label>
              <select
                value={selectedContact?.id || ''}
                onChange={(e) => handleContactChange(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e1e8ed', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Choose from contacts...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `- ${c.company}` : ''} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedContact && showContactNotes && (
              <div style={{
                padding: '16px',
                background: '#f0f8ff',
                border: '2px solid #3498db',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '16px', color: '#2c3e50' }}>
                  Contact Information: {selectedContact.name}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  {selectedContact.company && (
                    <div style={{ fontSize: '14px' }}>
                      <strong>Company:</strong> {selectedContact.company}
                    </div>
                  )}
                  {selectedContact.position && (
                    <div style={{ fontSize: '14px' }}>
                      <strong>Position:</strong> {selectedContact.position}
                    </div>
                  )}
                  {selectedContact.group_affiliation && (
                    <div style={{ fontSize: '14px' }}>
                      <strong>Group:</strong> {selectedContact.group_affiliation}
                    </div>
                  )}
                  {selectedContact.timeline && (
                    <div style={{ fontSize: '14px' }}>
                      <strong>Timeline:</strong> {selectedContact.timeline}
                    </div>
                  )}
                  {selectedContact.status && (
                    <div style={{ fontSize: '14px' }}>
                      <strong>Status:</strong> {selectedContact.status.replace('_', ' ')}
                    </div>
                  )}
                </div>
                {selectedContact.linkedin && (
                  <div style={{ marginBottom: '12px' }}>
                    <a
                      href={selectedContact.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#0077b5', fontSize: '14px' }}
                    >
                      View LinkedIn Profile →
                    </a>
                  </div>
                )}
                {selectedContact.notes && (
                  <div style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                    fontSize: '13px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <strong>Notes:</strong><br />
                    {selectedContact.notes}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label>Select Template (Optional)</label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => handleTemplateChange(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', border: '2px solid #e1e8ed', borderRadius: '8px', fontSize: '14px' }}
              >
                <option value="">Start from scratch</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 ? (
              <div className="variables-section">
                <h3>Fill in Variables</h3>
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable} className="variable-input">
                    <label>{variable}:</label>
                    <input
                      type="text"
                      value={variables[variable] || ''}
                      onChange={(e) => setVariables({ ...variables, [variable]: e.target.value })}
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}
              </div>
            ) : selectedTemplate ? (
              <div style={{
                padding: '16px',
                background: '#fff3cd',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #ffeaa7'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                  <strong>No variables detected in this template.</strong> To use variables, edit the template and add placeholders like <code>{'{{banker_name}}'}</code>, <code>{'{{bank_name}}'}</code>, or <code>{'{{school}}'}</code> in the subject or body.
                </p>
              </div>
            ) : null}

            <div className="form-group">
              <label>To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="banker@bank.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                required
              />
            </div>

            <div className="form-group">
              <label>Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body"
                style={{ minHeight: '200px' }}
                required
              />
            </div>

            {resumeInfo && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="attach-resume"
                  checked={attachResume}
                  onChange={(e) => setAttachResume(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="attach-resume" style={{ margin: 0, cursor: 'pointer' }}>
                  Attach resume ({resumeInfo.filename})
                </label>
              </div>
            )}

            {signatureInfo?.text && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="include-signature"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                />
                <label htmlFor="include-signature" style={{ margin: 0, cursor: 'pointer' }}>
                  Include email signature
                </label>
              </div>
            )}

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="schedule-email"
                checked={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.checked)}
                style={{ width: 'auto', margin: 0 }}
              />
              <label htmlFor="schedule-email" style={{ margin: 0, cursor: 'pointer' }}>
                Schedule send
              </label>
            </div>

            {scheduleEmail && (
              <div className="form-group">
                <label>Schedule for</label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #e1e8ed', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-success"
              disabled={sending}
              style={{ width: 'auto' }}
            >
              {sending ? (scheduleEmail ? 'Scheduling...' : 'Sending...') : (scheduleEmail ? 'Schedule Email' : 'Send Email')}
            </button>
          </form>

          {(subject || body) && (
            <div className="template-preview">
              <h3>Preview</h3>
              <div className="preview-subject">
                <strong>Subject:</strong> {previewSubject}
              </div>
              <div className="preview-body">{previewBody}</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Compose;
