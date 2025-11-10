import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { emailsAPI } from '../api/emails';
import { templatesAPI } from '../api/templates';

function Compose() {
  const location = useLocation();
  const navigate = useNavigate();
  const templateFromState = location.state?.template;

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [variables, setVariables] = useState({});
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
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

  const loadTemplate = (template) => {
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
    setSending(true);

    try {
      await emailsAPI.send({
        to,
        subject,
        body,
        templateId: selectedTemplate?.id,
        variables,
        useHtml: true
      });
      setSuccess('Email sent successfully!');
      
      // Reset form
      setTimeout(() => {
        setTo('');
        setSubject('');
        setBody('');
        setVariables({});
        setSelectedTemplate(null);
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

            {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
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
            )}

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

            <button 
              type="submit" 
              className="btn btn-success" 
              disabled={sending}
              style={{ width: 'auto' }}
            >
              {sending ? 'Sending...' : 'Send Email'}
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
