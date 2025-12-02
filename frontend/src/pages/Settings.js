import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { gmailAPI } from '../api/gmail';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function Settings() {
  const [signature, setSignature] = useState('');
  const [signatureEditing, setSignatureEditing] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState('');

  const [resumeInfo, setResumeInfo] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load signature
      const signatureData = await gmailAPI.getSignature();
      setSignature(signatureData.text || '');

      // Load resume info
      const response = await fetch(`${API_BASE_URL}/api/resume/info`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Only set resumeInfo if hasResume is true
        setResumeInfo(data.hasResume ? data : null);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSignature = async () => {
    if (!signature.trim()) {
      setSignatureMessage('Signature cannot be empty');
      return;
    }

    setSignatureMessage('');
    setSavingSignature(true);
    try {
      const result = await gmailAPI.saveSignature(signature);
      setSignatureEditing(false);
      setSignatureMessage(result.message || 'Signature saved and synced to Gmail successfully!');
      setTimeout(() => setSignatureMessage(''), 3000);
    } catch (error) {
      setSignatureMessage('Failed to save signature: ' + (error.response?.data?.error || error.message));
    } finally {
      setSavingSignature(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    setUploadingResume(true);
    setResumeMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setResumeInfo(data);
      setResumeMessage('Resume uploaded successfully!');
      setTimeout(() => setResumeMessage(''), 3000);
    } catch (error) {
      setResumeMessage('Failed to upload resume: ' + error.message);
    } finally {
      setUploadingResume(false);
    }
  };

  const deleteResume = async () => {
    if (!window.confirm('Are you sure you want to delete your resume?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setResumeInfo(null);
      setResumeMessage('Resume deleted successfully');
      setTimeout(() => setResumeMessage(''), 3000);
    } catch (error) {
      setResumeMessage('Failed to delete resume: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Signature & Resume</h1>
        <p>Manage your email signature and resume</p>
      </div>

      {/* Email Signature Section */}
      <div className="card">
        <h2>Email Signature</h2>
        <p style={{ marginBottom: '16px', color: '#657786', fontSize: '14px' }}>
          Your email signature syncs directly with Gmail and can be included in emails.
        </p>

        {signatureMessage && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: signatureMessage.includes('Failed') || signatureMessage.includes('cannot') ? '#fee' : '#efe',
            color: signatureMessage.includes('Failed') || signatureMessage.includes('cannot') ? '#c33' : '#363',
            fontSize: '14px'
          }}>
            {signatureMessage}
          </div>
        )}

        {!signatureEditing ? (
          <div>
            {signature ? (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '8px', color: '#14171a' }}>Current Signature:</h3>
                <div style={{
                  padding: '12px',
                  border: '1px solid #e1e8ed',
                  borderRadius: '6px',
                  background: '#f7f9fa',
                  fontSize: '13px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  whiteSpace: 'pre-wrap'
                }}>
                  {signature}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#657786', marginBottom: '16px' }}>
                No signature set. Click "Edit Signature" to create one.
              </p>
            )}
            <button
              onClick={() => setSignatureEditing(true)}
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
            >
              {signature ? 'Edit Signature' : 'Create Signature'}
            </button>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#14171a' }}>
              Signature:
            </label>
            <textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Enter your signature here...&#10;&#10;Example:&#10;Best regards,&#10;Your Name&#10;Your Title&#10;Company Name"
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                border: '2px solid #e1e8ed',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'Arial, Helvetica, sans-serif',
                marginBottom: '12px',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={saveSignature}
                className="btn btn-success"
                disabled={savingSignature}
                style={{ padding: '8px 16px' }}
              >
                {savingSignature ? 'Saving & Syncing to Gmail...' : 'Save & Sync to Gmail'}
              </button>
              <button
                onClick={() => {
                  setSignatureEditing(false);
                  loadData();
                }}
                className="btn"
                style={{ padding: '8px 16px', background: '#657786' }}
                disabled={savingSignature}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resume Section */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Resume</h2>
        <p style={{ marginBottom: '16px', color: '#657786', fontSize: '14px' }}>
          Upload your resume to attach to emails when networking.
        </p>

        {resumeMessage && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: resumeMessage.includes('Failed') ? '#fee' : '#efe',
            color: resumeMessage.includes('Failed') ? '#c33' : '#363',
            fontSize: '14px'
          }}>
            {resumeMessage}
          </div>
        )}

        {resumeInfo ? (
          <div>
            <div style={{
              padding: '12px',
              border: '1px solid #e1e8ed',
              borderRadius: '6px',
              background: '#f7f9fa',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '20px' }}>📄</span>
                <strong style={{ fontSize: '14px' }}>{resumeInfo.filename}</strong>
              </div>
              <p style={{ fontSize: '12px', color: '#657786', margin: '0' }}>
                Uploaded: {new Date(resumeInfo.uploadedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <label className="btn btn-primary" style={{ padding: '8px 16px', cursor: 'pointer' }}>
                {uploadingResume ? 'Uploading...' : 'Replace Resume'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeUpload}
                  disabled={uploadingResume}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={deleteResume}
                className="btn"
                style={{ padding: '8px 16px', background: '#e74c3c', color: 'white' }}
              >
                Delete Resume
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '14px', color: '#657786', marginBottom: '16px' }}>
              No resume uploaded. Upload a PDF, DOC, or DOCX file (max 5MB).
            </p>
            <label className="btn btn-primary" style={{ padding: '8px 16px', cursor: 'pointer' }}>
              {uploadingResume ? 'Uploading...' : 'Upload Resume'}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}
      </div>

    </Layout>
  );
}

export default Settings;
