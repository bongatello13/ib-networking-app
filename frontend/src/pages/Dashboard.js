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

  const disconnectGmail = async () => {
    if (window.confirm('Are you sure you want to disconnect your Gmail account?')) {
      try {
        await gmailAPI.disconnect();
        setGmailStatus({ connected: false, gmailAddress: null });
      } catch (error) {
        console.error('Error disconnecting Gmail:', error);
        alert('Failed to disconnect Gmail');
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="dashboard-loading">Loading dashboard...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your IB networking overview</p>
      </div>

      <div className="card">
        <h2>Gmail Connection</h2>
        {gmailStatus?.connected ? (
          <div className="status-connected">
            <p>✅ Connected as: {gmailStatus.gmailAddress}</p>
            <button onClick={disconnectGmail} className="btn btn-danger" style={{ marginTop: '12px' }}>
              Disconnect Gmail
            </button>
          </div>
        ) : (
          <div className="status-disconnected">
            <p>❌ Gmail not connected</p>
            <button onClick={connectGmail} className="btn btn-primary">
              Connect Gmail
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button
            onClick={() => navigate('/compose')}
            className="btn btn-primary"
            disabled={!gmailStatus?.connected}
          >
            ✉️ Compose Email
          </button>
          <button onClick={() => navigate('/contacts')} className="btn btn-secondary">
            👥 View Contacts
          </button>
          <button onClick={() => navigate('/firms')} className="btn btn-secondary">
            🏢 View Firms
          </button>
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;
