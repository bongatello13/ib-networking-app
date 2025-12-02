import { useState, useEffect } from 'react';
import { contactsAPI } from '../api/contacts';
import './EmailThreads.css';

function EmailThreads({ contactId, contact }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedEmailId, setExpandedEmailId] = useState(null);

  useEffect(() => {
    loadEmails();
  }, [contactId]);

  const loadEmails = async () => {
    try {
      console.log('[EmailThreads] Loading emails for contact:', contactId);
      setLoading(true);
      setError('');
      const data = await contactsAPI.getEmails(contactId);
      console.log('[EmailThreads] Received data:', data);
      setEmails(data.emails || []);
    } catch (err) {
      console.error('[EmailThreads] Error loading emails:', err);
      console.error('[EmailThreads] Error response:', err.response);
      setError(err.response?.data?.error || err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmail = (emailId) => {
    setExpandedEmailId(expandedEmailId === emailId ? null : emailId);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmailPreview = (email) => {
    if (email.type === 'sent') {
      return email.body?.substring(0, 150) || '(No preview available)';
    } else {
      return email.snippet || email.body?.substring(0, 150) || '(No preview available)';
    }
  };

  if (loading) {
    return (
      <div className="email-threads-container">
        <div className="email-threads-loading">
          <div className="spinner-small"></div>
          <p>Loading email history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-threads-container">
        <div className="email-threads-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button className="btn btn-sm btn-secondary" onClick={loadEmails}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-threads-container">
      <div className="email-threads-header">
        <h3>Email History</h3>
        <span className="email-count">{emails.length} {emails.length === 1 ? 'email' : 'emails'}</span>
      </div>

      {emails.length === 0 ? (
        <div className="email-threads-empty">
          <div className="empty-icon">📧</div>
          <p>No email history</p>
          <p className="empty-hint">
            Emails sent through the app and received from {contact?.name || 'this contact'} will appear here
          </p>
        </div>
      ) : (
        <div className="email-threads-list">
          {emails.map((email, index) => {
            const isExpanded = expandedEmailId === (email.id || index);
            const isSent = email.type === 'sent';

            return (
              <div
                key={email.id || index}
                className={`email-thread-item ${isSent ? 'sent' : 'received'} ${isExpanded ? 'expanded' : ''}`}
              >
                <div className="email-thread-header" onClick={() => toggleEmail(email.id || index)}>
                  <div className="email-thread-info">
                    <div className="email-thread-direction">
                      {isSent ? (
                        <span className="direction-badge sent">
                          <span className="direction-icon">➡️</span>
                          Sent
                        </span>
                      ) : (
                        <span className="direction-badge received">
                          <span className="direction-icon">⬅️</span>
                          Received
                        </span>
                      )}
                    </div>
                    <div className="email-thread-subject">
                      {email.subject || '(No Subject)'}
                    </div>
                    <div className="email-thread-preview">
                      {!isExpanded && getEmailPreview(email)}
                    </div>
                  </div>
                  <div className="email-thread-meta">
                    <span className="email-thread-date">{formatDate(email.date)}</span>
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="email-thread-body">
                    {isSent ? (
                      <>
                        <div className="email-detail-row">
                          <span className="email-detail-label">To:</span>
                          <span className="email-detail-value">{email.recipient}</span>
                        </div>
                        <div className="email-body-content">
                          {email.body || '(No content)'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="email-detail-row">
                          <span className="email-detail-label">From:</span>
                          <span className="email-detail-value">{email.from}</span>
                        </div>
                        <div className="email-detail-row">
                          <span className="email-detail-label">To:</span>
                          <span className="email-detail-value">{email.to}</span>
                        </div>
                        <div className="email-body-content">
                          {email.body || email.snippet || '(No content)'}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmailThreads;
