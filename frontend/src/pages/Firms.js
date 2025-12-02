import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { contactsAPI } from '../api/contacts';
import { companiesAPI } from '../api/companies';
import './CRM.css';

function Firms() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFirmId, setExpandedFirmId] = useState(null);
  const [showFirmModal, setShowFirmModal] = useState(false);
  const [editingFirm, setEditingFirm] = useState(null);
  const [firmFormData, setFirmFormData] = useState({
    name: '',
    ranking: 'Target'
  });
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingContact, setViewingContact] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, companiesData] = await Promise.all([
        contactsAPI.getAll(),
        companiesAPI.getAll()
      ]);
      setContacts(contactsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for each company
  const companiesWithStats = useMemo(() => {
    return companies.map(company => {
      const companyContacts = contacts.filter(c => c.company_id === company.id);
      const emailedCount = companyContacts.filter(c => c.status === 'emailed' || c.status === 'called').length;
      const calledCount = companyContacts.filter(c => c.status === 'called').length;

      return {
        ...company,
        contactCount: companyContacts.length,
        emailedCount,
        calledCount,
        contacts: companyContacts
      };
    });
  }, [companies, contacts]);

  const toggleFirm = (firmId) => {
    setExpandedFirmId(expandedFirmId === firmId ? null : firmId);
  };

  const getStatusBadge = (status) => {
    const badges = {
      none: { text: 'Not Contacted', className: 'status-none' },
      emailed: { text: 'Emailed', className: 'status-emailed' },
      called: { text: 'Called', className: 'status-called' }
    };
    return badges[status] || badges.none;
  };

  const getRankingBadge = (ranking) => {
    const badges = {
      'Heavy Target': { icon: '🎯', text: 'Heavy Target' },
      'Target': { icon: '🔵', text: 'Target' },
      'Lower Priority': { icon: '⚪', text: 'Lower' }
    };
    return badges[ranking] || badges['Target'];
  };

  const getQualityStars = (quality) => {
    const qualities = {
      good: '⭐⭐⭐',
      okay: '⭐⭐',
      poor: '⭐'
    };
    return qualities[quality] || '';
  };

  const formatDate = (dateString, isUpcoming = false) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();

    // Normalize to start of day for date comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = dateOnly - nowOnly;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // For upcoming events (future dates)
    if (isUpcoming) {
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 1 && diffDays < 7) return `in ${diffDays}d`;
      if (diffDays >= 7 && diffDays < 30) return `in ${Math.floor(diffDays / 7)}w`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // For past dates (last contact, etc.)
    const pastDiffDays = -diffDays; // Negative of future diff
    if (pastDiffDays === 0) return 'Today';
    if (pastDiffDays === 1) return 'Yesterday';
    if (pastDiffDays > 0 && pastDiffDays < 7) return `${pastDiffDays}d ago`;
    if (pastDiffDays >= 7 && pastDiffDays < 30) return `${Math.floor(pastDiffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openFirmModal = (firm = null) => {
    if (firm) {
      setEditingFirm(firm);
      setFirmFormData({
        name: firm.name || '',
        ranking: firm.ranking || 'Target'
      });
    } else {
      setEditingFirm(null);
      setFirmFormData({
        name: '',
        ranking: 'Target'
      });
    }
    setShowFirmModal(true);
  };

  const closeFirmModal = () => {
    setShowFirmModal(false);
    setEditingFirm(null);
    setFirmFormData({
      name: '',
      ranking: 'Target'
    });
  };

  const handleFirmSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFirm) {
        await companiesAPI.update(editingFirm.id, firmFormData);
      } else {
        await companiesAPI.create(firmFormData);
      }
      await loadData();
      closeFirmModal();
    } catch (error) {
      console.error('Error saving firm:', error);
      alert('Failed to save firm: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteFirm = async (firm) => {
    if (!window.confirm(`Are you sure you want to delete ${firm.name}?`)) {
      return;
    }
    try {
      await companiesAPI.delete(firm.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting firm:', error);
      alert('Failed to delete firm');
    }
  };

  const handleViewContact = (contact) => {
    setViewingContact(contact);
    setShowViewModal(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="crm-loading">
          <div className="spinner"></div>
          <p>Loading your firms...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="crm-container">
        <div className="firms-view">
          <div className="crm-header">
            <h1>Firms</h1>
            <div className="header-stats">
              <span className="stat-pill">🏢 {companies.length} firms</span>
              <button className="btn btn-primary" onClick={() => openFirmModal()}>
                + Add Firm
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/contacts')}>
                View All Contacts
              </button>
            </div>
          </div>

          {companiesWithStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>No firms yet</h3>
              <p>Add your first target firm to start tracking your networking progress</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '1rem' }}>
                Note: Use the Companies API to add firms to your CRM
              </p>
            </div>
          ) : (
            <div className="firms-list">
              {companiesWithStats.map(firm => {
                const ranking = getRankingBadge(firm.ranking);
                const isExpanded = expandedFirmId === firm.id;

                return (
                  <div key={firm.id} className={`firm-item ${isExpanded ? 'expanded' : ''}`}>
                    <div className="firm-header" onClick={() => toggleFirm(firm.id)}>
                      <div className="firm-info">
                        <div className="firm-name-row">
                          <h3>{firm.name}</h3>
                          <span className={`ranking-badge ranking-${ranking.icon}`}>
                            {ranking.icon} {ranking.text}
                          </span>
                        </div>
                        <div className="firm-stats-row">
                          <span className="stat">👥 {firm.contactCount} contacts</span>
                          <span className="stat">📧 {firm.emailedCount} emailed</span>
                          <span className="stat">📞 {firm.calledCount} called</span>
                        </div>
                      </div>
                      <div className="expand-icon">
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="firm-contacts">
                        <div className="firm-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openFirmModal(firm);
                            }}
                          >
                            ✏️ Edit Firm
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFirm(firm);
                            }}
                            style={{ background: '#e74c3c', color: 'white' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>

                        {firm.contacts.length === 0 ? (
                          <div className="no-contacts">
                            <p>No contacts yet for this firm</p>
                            <p style={{ fontSize: '13px', color: '#999', marginTop: '0.5rem' }}>
                              Use the Contacts API to add contacts for this firm
                            </p>
                          </div>
                        ) : (
                          <div className="contacts-list">
                            {firm.contacts.map(contact => {
                              const status = getStatusBadge(contact.status);
                              return (
                                <div key={contact.id} className="contact-row">
                                  <div className="contact-main">
                                    <span className={`status-badge ${status.className}`}>{status.text}</span>
                                    <div className="contact-details">
                                      <span className="contact-name">
                                        {contact.name}
                                      </span>
                                      {contact.position && (
                                        <span className="contact-position">({contact.position})</span>
                                      )}
                                      {contact.quality && (
                                        <span className="contact-quality" title={`Quality: ${contact.quality}`}>
                                          {getQualityStars(contact.quality)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="contact-meta">
                                    {contact.last_contact_date && (
                                      <span className="last-contact">{formatDate(contact.last_contact_date)}</span>
                                    )}
                                    <div className="contact-actions">
                                      <button
                                        className="action-btn"
                                        onClick={() => handleViewContact(contact)}
                                        title="View details"
                                      >
                                        👁️
                                      </button>
                                      <button
                                        className="action-btn"
                                        onClick={() => navigate(`/compose?email=${contact.email}`)}
                                        disabled={!contact.email}
                                        title="Send email"
                                      >
                                        ✉️
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Firm Modal */}
        {showFirmModal && (
          <div className="modal-overlay" onClick={closeFirmModal}>
            <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingFirm ? 'Edit Firm' : 'Add Firm'}</h2>
                <button className="modal-close" onClick={closeFirmModal}>✕</button>
              </div>

              <form onSubmit={handleFirmSubmit}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={firmFormData.name}
                    onChange={(e) => setFirmFormData({ ...firmFormData, name: e.target.value })}
                    placeholder="Goldman Sachs"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ranking</label>
                  <select
                    value={firmFormData.ranking}
                    onChange={(e) => setFirmFormData({ ...firmFormData, ranking: e.target.value })}
                  >
                    <option value="Heavy Target">🎯 Heavy Target</option>
                    <option value="Target">🔵 Target</option>
                    <option value="Lower Priority">⚪ Lower Priority</option>
                  </select>
                </div>

                <div className="modal-actions">
                  <div className="modal-actions-right">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeFirmModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      {editingFirm ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact View Modal */}
        {showViewModal && viewingContact && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Contact Details</h2>
                <button className="modal-close" onClick={() => setShowViewModal(false)}>✕</button>
              </div>

              <div className="contact-view-content">
                <div className="view-section">
                  <h3>Basic Information</h3>
                  <div className="view-field">
                    <label>Name:</label>
                    <span>{viewingContact.name}</span>
                  </div>
                  <div className="view-field">
                    <label>Position:</label>
                    <span>{viewingContact.position || '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Company:</label>
                    <span>{viewingContact.company || '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Email:</label>
                    <span>{viewingContact.email || '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Phone:</label>
                    <span>{viewingContact.phone || '—'}</span>
                  </div>
                </div>

                <div className="view-section">
                  <h3>Status & Quality</h3>
                  <div className="view-field">
                    <label>Status:</label>
                    <span>
                      <span className={`status-badge ${getStatusBadge(viewingContact.status).className}`}>
                        {getStatusBadge(viewingContact.status).text}
                      </span>
                    </span>
                  </div>
                  <div className="view-field">
                    <label>Connection Quality:</label>
                    <span>{viewingContact.quality ? getQualityStars(viewingContact.quality) : '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Last Email Date:</label>
                    <span>{viewingContact.email_date ? new Date(viewingContact.email_date).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Last Call Date:</label>
                    <span>{viewingContact.phone_date ? new Date(viewingContact.phone_date).toLocaleDateString() : '—'}</span>
                  </div>
                </div>

                <div className="view-section">
                  <h3>Notes</h3>
                  <div className="view-field-full">
                    <label>Notes on Person:</label>
                    <p className="notes-display">{viewingContact.notes || 'No notes'}</p>
                  </div>
                  <div className="view-field-full">
                    <label>Email Details/Notes:</label>
                    <p className="notes-display">{viewingContact.email_notes || 'No email notes'}</p>
                  </div>
                  <div className="view-field-full">
                    <label>Phone Call Details:</label>
                    <p className="notes-display">{viewingContact.call_notes || 'No call notes'}</p>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowViewModal(false)}
                  style={{ width: 'auto' }}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    navigate('/contacts');
                  }}
                  style={{ width: 'auto' }}
                >
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Firms;
