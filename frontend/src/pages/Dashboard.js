import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { gmailAPI } from '../api/gmail';
import { emailsAPI } from '../api/emails';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [gmailStatus, setGmailStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gmailData, statsData] = await Promise.all([
        gmailAPI.getStatus(),
        emailsAPI.getStats(),
      ]);
      setGmailStatus(gmailData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      const { authUrl } = await gmailAPI.getAuthUrl();
      window.open(authUrl, '_blank', 'width=600,height=600');
      // Poll for connection status
      const interval = setInterval(async () => {
        const status = await gmailAPI.getStatus();
        if (status.connected) {
          setGmailStatus(status);
          clearInterval(interval);
        }
      }, 2000);
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your IB networking emails</p>
      </div>

      {!gmailStatus?.connected && (
        <div className="card">
          <h2>Connect Gmail</h2>
          <p style={{ marginBottom: '16px', color: '#7f8c8d' }}>
            Connect your Gmail account to start sending personalized networking emails to investment bankers.
          </p>
          <button onClick={connectGmail} className="btn btn-primary" style={{ width: 'auto' }}>
            Connect Gmail Account
          </button>
        </div>
      )}

      {gmailStatus?.connected && (
        <div className="gmail-status connected" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="status-icon">✓</span>
            <div>
              <strong>Gmail Connected</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>{gmailStatus.gmailAddress}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to disconnect Gmail? You will need to reconnect to send emails.')) {
                await gmailAPI.disconnect();
                setGmailStatus({ connected: false });
              }
            }}
            className="btn"
            style={{ padding: '6px 12px', fontSize: '13px', background: '#657786' }}
          >
            Disconnect
          </button>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Emails Sent</h3>
          <p>{stats?.totalSent || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Unique Recipients</h3>
          <p>{stats?.uniqueRecipients || 0}</p>
        </div>
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <button 
            onClick={() => navigate('/compose')} 
            className="btn btn-primary"
            disabled={!gmailStatus?.connected}
          >
            Compose Email
          </button>
          <button 
            onClick={() => navigate('/templates')} 
            className="btn btn-secondary"
          >
            Manage Templates
          </button>
          <button 
            onClick={() => navigate('/sent')} 
            className="btn btn-secondary"
          >
            View Sent Emails
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
