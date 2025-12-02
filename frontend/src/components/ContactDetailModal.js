import { useState, useEffect } from 'react';
import { contactsAPI } from '../api/contacts';
import { companiesAPI } from '../api/companies';
import Timeline from './Timeline';
import EmailThreads from './EmailThreads';
import './EventModal.css';
import './ContactDetailModal.css';

function ContactDetailModal({ contact, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_id: '',
    position: '',
    status: 'none'
  });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [contact]);

  const loadData = async () => {
    try {
      setLoading(true);
      const companiesData = await companiesAPI.getAll();
      setCompanies(companiesData);

      // Initialize form with contact data
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        company_id: contact.company_id || '',
        position: contact.position || '',
        status: contact.status || 'none'
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await contactsAPI.update(contact.id, formData);
      setEditing(false);
      onUpdate(); // Reload parent data
    } catch (error) {
      console.error('Error updating contact:', error);
      alert('Failed to update contact: ' + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      none: { icon: '🔴', text: 'Not Contacted' },
      emailed: { icon: '🟡', text: 'Emailed' },
      called: { icon: '🟢', text: 'Called' }
    };
    return badges[status] || badges.none;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCompanyName = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : '—';
  };

  const statusBadge = getStatusBadge(contact.status);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal contact-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Loading contact details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal contact-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{contact.name}</h2>
            <p className="contact-subtitle">
              {contact.position && `${contact.position} · `}
              {getCompanyName(contact.company_id)}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="contact-detail-tabs">
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            📋 Details
          </button>
          <button
            className={`tab ${activeTab === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveTab('emails')}
          >
            📧 Emails
          </button>
          <button
            className={`tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            📝 Timeline
          </button>
        </div>

        <div className="contact-detail-content">
          {activeTab === 'details' && (
            <div className="contact-details-tab">
              {!editing ? (
                <div className="contact-info-view">
                  <div className="info-section">
                    <div className="info-row">
                      <label>Status</label>
                      <div className="status-badge">
                        <span>{statusBadge.icon}</span>
                        <span>{statusBadge.text}</span>
                      </div>
                    </div>

                    <div className="info-row">
                      <label>Email</label>
                      <div>{contact.email || '—'}</div>
                    </div>

                    <div className="info-row">
                      <label>Company</label>
                      <div>{getCompanyName(contact.company_id)}</div>
                    </div>

                    <div className="info-row">
                      <label>Position</label>
                      <div>{contact.position || '—'}</div>
                    </div>

                    <div className="info-row">
                      <label>Last Contact</label>
                      <div>{formatDate(contact.last_contact_date)}</div>
                    </div>

                    {contact.email_date && (
                      <div className="info-row">
                        <label>Last Emailed</label>
                        <div>{formatDate(contact.email_date)}</div>
                      </div>
                    )}

                    {contact.phone_date && (
                      <div className="info-row">
                        <label>Last Called</label>
                        <div>{formatDate(contact.phone_date)}</div>
                      </div>
                    )}

                    {contact.quality && (
                      <div className="info-row">
                        <label>Quality</label>
                        <div>
                          {contact.quality === 'good' && '⭐⭐⭐ Good'}
                          {contact.quality === 'okay' && '⭐⭐ Okay'}
                          {contact.quality === 'poor' && '⭐ Poor'}
                        </div>
                      </div>
                    )}

                    {contact.next_followup_date && (
                      <div className="info-row">
                        <label>Next Follow-up</label>
                        <div>{formatDate(contact.next_followup_date)}</div>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => setEditing(true)}
                  >
                    ✏️ Edit Contact
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSave} className="contact-edit-form">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Company *</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                      required
                    >
                      <option value="">Select a company...</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Analyst"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="none">🔴 Not Contacted</option>
                      <option value="emailed">🟡 Emailed</option>
                      <option value="called">🟢 Called</option>
                    </select>
                  </div>

                  <div className="modal-actions">
                    <div className="modal-actions-right">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditing(false);
                          setFormData({
                            name: contact.name || '',
                            email: contact.email || '',
                            company_id: contact.company_id || '',
                            position: contact.position || '',
                            status: contact.status || 'none'
                          });
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'emails' && (
            <EmailThreads contactId={contact.id} contact={contact} />
          )}

          {activeTab === 'timeline' && (
            <Timeline contactId={contact.id} contact={contact} />
          )}
        </div>
      </div>
    </div>
  );
}

export default ContactDetailModal;
