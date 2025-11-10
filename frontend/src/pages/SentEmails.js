import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { emailsAPI } from '../api/emails';

function SentEmails() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const data = await emailsAPI.getSent();
      setEmails(data);
    } catch (error) {
      console.error('Error loading sent emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Sent Emails</h1>
        <p>View your email history</p>
      </div>

      {loading ? (
        <div>Loading sent emails...</div>
      ) : emails.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No Emails Sent Yet</h3>
            <p>Your sent emails will appear here</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Template</th>
                  <th>Sent At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id}>
                    <td>{email.recipient}</td>
                    <td>{email.subject}</td>
                    <td>{email.template_name || <span style={{ color: '#95a5a6' }}>No template</span>}</td>
                    <td>{formatDate(email.sent_at)}</td>
                    <td>
                      <button 
                        onClick={() => setSelectedEmail(email)} 
                        className="btn-small btn-edit"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Email Details</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>To:</strong> {selectedEmail.recipient}
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Subject:</strong> {selectedEmail.subject}
            </div>
            
            {selectedEmail.template_name && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Template:</strong> {selectedEmail.template_name}
              </div>
            )}
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Sent:</strong> {formatDate(selectedEmail.sent_at)}
            </div>
            
            <div style={{ marginTop: '24px' }}>
              <strong>Body:</strong>
              <div style={{ 
                marginTop: '12px', 
                padding: '16px', 
                background: '#f8f9fa', 
                borderRadius: '8px',
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6'
              }}>
                {selectedEmail.body}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                onClick={() => setSelectedEmail(null)} 
                className="btn btn-primary" 
                style={{ width: 'auto' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default SentEmails;
