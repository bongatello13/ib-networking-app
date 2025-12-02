import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { emailsAPI } from '../api/emails';
import './ScheduledEmails.css';

function ScheduledEmails() {
  const navigate = useNavigate();
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('pending'); // pending, sent, failed, all

  useEffect(() => {
    loadScheduledEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadScheduledEmails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await emailsAPI.getScheduled();

      // Filter based on selected filter
      let filtered = data;
      if (filter !== 'all') {
        filtered = data.filter(email => email.status === filter);
      }

      setScheduledEmails(filtered);
    } catch (err) {
      setError('Failed to load scheduled emails');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled email?')) {
      return;
    }

    try {
      await emailsAPI.cancelScheduled(id);
      setSuccess('Scheduled email cancelled successfully');
      loadScheduledEmails();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel scheduled email');
      setTimeout(() => setError(''), 5000);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getTimeUntil = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return 'Past due';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'very soon';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', class: 'status-pending' },
      sending: { label: 'Sending', class: 'status-sending' },
      sent: { label: 'Sent', class: 'status-sent' },
      failed: { label: 'Failed', class: 'status-failed' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled' }
    };

    const badge = badges[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>📅 Scheduled Emails</h1>
        <p>View and manage your scheduled email sends</p>
      </div>

      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}

      <div className="scheduled-emails-container">
        <div className="filter-tabs">
          <button
            className={filter === 'pending' ? 'active' : ''}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button
            className={filter === 'sent' ? 'active' : ''}
            onClick={() => setFilter('sent')}
          >
            Sent
          </button>
          <button
            className={filter === 'failed' ? 'active' : ''}
            onClick={() => setFilter('failed')}
          >
            Failed
          </button>
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading scheduled emails...</p>
          </div>
        ) : scheduledEmails.length === 0 ? (
          <div className="empty-state">
            <h3>No scheduled emails</h3>
            <p>You don't have any {filter !== 'all' ? filter : ''} scheduled emails.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/compose')}
            >
              Compose & Schedule Email
            </button>
          </div>
        ) : (
          <div className="scheduled-emails-list">
            {scheduledEmails.map((email) => (
              <div key={email.id} className="scheduled-email-card">
                <div className="email-header">
                  <div className="email-to">
                    <strong>To:</strong> {email.to_email}
                  </div>
                  <div className="email-status">
                    {getStatusBadge(email.status)}
                  </div>
                </div>

                <div className="email-subject">
                  <strong>Subject:</strong> {email.subject}
                </div>

                <div className="email-body-preview">
                  {email.body.substring(0, 150)}
                  {email.body.length > 150 ? '...' : ''}
                </div>

                <div className="email-meta">
                  <div className="scheduled-time">
                    <strong>Scheduled:</strong> {formatDateTime(email.scheduled_for)}
                    {email.status === 'pending' && (
                      <span className="time-until"> ({getTimeUntil(email.scheduled_for)})</span>
                    )}
                  </div>

                  {email.sent_at && (
                    <div className="sent-time">
                      <strong>Sent:</strong> {formatDateTime(email.sent_at)}
                    </div>
                  )}

                  {email.error_message && (
                    <div className="error-message">
                      <strong>Error:</strong> {email.error_message}
                    </div>
                  )}
                </div>

                <div className="email-details">
                  {email.attach_resume && (
                    <span className="detail-badge">📎 Resume attached</span>
                  )}
                  {email.include_signature && (
                    <span className="detail-badge">✍️ With signature</span>
                  )}
                  {email.template_id && (
                    <span className="detail-badge">📄 From template</span>
                  )}
                </div>

                {email.status === 'pending' && (
                  <div className="email-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(email.id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default ScheduledEmails;
