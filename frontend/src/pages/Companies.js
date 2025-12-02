import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { companiesAPI } from '../api/companies';
import { contactsAPI } from '../api/contacts';
import './Companies.css';

function Companies() {
  const [companies, setCompanies] = useState([]);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);
  const [companyContacts, setCompanyContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [message, setMessage] = useState('');

  const [companyForm, setCompanyForm] = useState({
    name: '',
    ranking: 'Target',
    industry: '',
    sector: '',
    results_progress: '',
    notes: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    tags: [],
    quality: '',
    initial_note: ''
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const data = await companiesAPI.getAll();
      setCompanies(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading companies:', error);
      setLoading(false);
    }
  };

  const loadCompanyContacts = async (companyId) => {
    if (companyContacts[companyId]) {
      return; // Already loaded
    }

    try {
      const company = await companiesAPI.getOne(companyId);
      setCompanyContacts(prev => ({
        ...prev,
        [companyId]: company.contacts || []
      }));
    } catch (error) {
      console.error('Error loading company contacts:', error);
    }
  };

  const toggleCompany = async (companyId) => {
    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
    } else {
      setExpandedCompanyId(companyId);
      await loadCompanyContacts(companyId);
    }
  };

  const openCompanyModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setCompanyForm({
        name: company.name || '',
        ranking: company.ranking || 'Target',
        industry: company.industry || '',
        sector: company.sector || '',
        results_progress: company.results_progress || '',
        notes: company.notes || ''
      });
    } else {
      setEditingCompany(null);
      setCompanyForm({
        name: '',
        ranking: 'Target',
        industry: '',
        sector: '',
        results_progress: '',
        notes: ''
      });
    }
    setShowCompanyModal(true);
    setMessage('');
  };

  const openContactModal = (company) => {
    setSelectedCompany(company);
    setContactForm({
      name: '',
      email: '',
      phone: '',
      position: '',
      tags: [],
      quality: '',
      initial_note: ''
    });
    setShowContactModal(true);
    setMessage('');
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await companiesAPI.update(editingCompany.id, companyForm);
        setMessage('Company updated successfully!');
      } else {
        await companiesAPI.create(companyForm);
        setMessage('Company created successfully!');
      }
      await loadCompanies();
      setTimeout(() => {
        setShowCompanyModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage('Error saving company: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await contactsAPI.create({
        ...contactForm,
        company_id: selectedCompany.id,
        company: selectedCompany.name,
        status: 'none'
      });
      setMessage('Contact added successfully!');
      // Reload company contacts
      const company = await companiesAPI.getOne(selectedCompany.id);
      setCompanyContacts(prev => ({
        ...prev,
        [selectedCompany.id]: company.contacts || []
      }));
      setTimeout(() => {
        setShowContactModal(false);
        setMessage('');
      }, 1500);
    } catch (error) {
      setMessage('Error adding contact: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to delete this company? All associated contacts will be unlinked.')) {
      return;
    }
    try {
      await companiesAPI.delete(companyId);
      setMessage('Company deleted successfully!');
      await loadCompanies();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error deleting company: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'none':
        return <span className="status-dot status-none">🔴</span>;
      case 'emailed':
        return <span className="status-dot status-emailed">🟡</span>;
      case 'called':
        return <span className="status-dot status-called">🟢</span>;
      default:
        return <span className="status-dot status-none">⚪</span>;
    }
  };

  const getRankingBadge = (ranking) => {
    const badges = {
      'Heavy Target': <span className="ranking-badge heavy-target">🎯 Heavy Target</span>,
      'Target': <span className="ranking-badge target">🔵 Target</span>,
      'Lower Priority': <span className="ranking-badge lower-priority">⚪ Lower Priority</span>
    };
    return badges[ranking] || badges['Target'];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };

  const getQualityStars = (quality) => {
    switch (quality) {
      case 'good':
        return '⭐⭐⭐';
      case 'okay':
        return '⭐⭐';
      case 'poor':
        return '⭐';
      default:
        return '-';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">Loading companies...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="companies-container">
        <div className="page-header">
          <h1>Companies</h1>
          <button className="btn btn-primary" onClick={() => openCompanyModal()}>
            ➕ Add Company
          </button>
        </div>

        {message && <div className="message success">{message}</div>}

        {companies.length === 0 ? (
          <div className="empty-state">
            <p>No companies yet. Add your first target company to get started!</p>
            <button className="btn btn-primary" onClick={() => openCompanyModal()}>
              Add Company
            </button>
          </div>
        ) : (
          <div className="companies-list">
            {companies.map(company => (
              <div key={company.id} className="company-card">
                <div
                  className="company-header"
                  onClick={() => toggleCompany(company.id)}
                >
                  <div className="company-header-left">
                    <h2>{company.name}</h2>
                    {getRankingBadge(company.ranking)}
                    <span className="contact-count">
                      {company.contact_count || 0} contacts
                    </span>
                  </div>
                  <div className="company-header-right">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCompanyModal(company);
                      }}
                      title="Edit company"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCompany(company.id);
                      }}
                      title="Delete company"
                    >
                      🗑️
                    </button>
                    <span className="expand-icon">
                      {expandedCompanyId === company.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {expandedCompanyId === company.id && (
                  <div className="company-body">
                    <div className="company-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => openContactModal(company)}
                      >
                        ➕ Add Contact
                      </button>
                    </div>

                    {companyContacts[company.id]?.length > 0 ? (
                      <div className="contacts-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Status</th>
                              <th>Name</th>
                              <th>Position</th>
                              <th>Tags</th>
                              <th>Last Contact</th>
                              <th>Quality</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companyContacts[company.id].map(contact => (
                              <tr key={contact.id}>
                                <td>{getStatusIcon(contact.status)}</td>
                                <td className="contact-name">{contact.name}</td>
                                <td>{contact.position || '-'}</td>
                                <td>
                                  <div className="tags">
                                    {contact.tags?.slice(0, 3).map((tag, idx) => (
                                      <span key={idx} className="tag">{tag}</span>
                                    ))}
                                    {contact.tags?.length > 3 && (
                                      <span className="tag">+{contact.tags.length - 3}</span>
                                    )}
                                  </div>
                                </td>
                                <td>{formatDate(contact.last_contact_date)}</td>
                                <td>{getQualityStars(contact.quality)}</td>
                                <td>
                                  <div className="action-buttons">
                                    <button
                                      className="btn-small"
                                      onClick={() => window.location.href = '/compose'}
                                      title="Send email"
                                    >
                                      ✉️
                                    </button>
                                    <button
                                      className="btn-small"
                                      title="Log call"
                                    >
                                      📞
                                    </button>
                                    <button
                                      className="btn-small"
                                      title="Add note"
                                    >
                                      📝
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-contacts">
                        <p>No contacts yet for this company.</p>
                        <button
                          className="btn btn-secondary"
                          onClick={() => openContactModal(company)}
                        >
                          Add First Contact
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Company Modal */}
        {showCompanyModal && (
          <div className="modal-overlay" onClick={() => setShowCompanyModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editingCompany ? 'Edit Company' : 'Add Company'}</h2>
              <form onSubmit={handleCompanySubmit}>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ranking</label>
                  <select
                    value={companyForm.ranking}
                    onChange={(e) => setCompanyForm({ ...companyForm, ranking: e.target.value })}
                  >
                    <option value="Heavy Target">Heavy Target</option>
                    <option value="Target">Target</option>
                    <option value="Lower Priority">Lower Priority</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Industry</label>
                  <input
                    type="text"
                    value={companyForm.industry}
                    onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                    placeholder="e.g., Investment Banking, Consulting"
                  />
                </div>

                <div className="form-group">
                  <label>Sector</label>
                  <input
                    type="text"
                    value={companyForm.sector}
                    onChange={(e) => setCompanyForm({ ...companyForm, sector: e.target.value })}
                    placeholder="e.g., Financial Services, Technology"
                  />
                </div>

                <div className="form-group">
                  <label>Results/Progress</label>
                  <textarea
                    value={companyForm.results_progress}
                    onChange={(e) => setCompanyForm({ ...companyForm, results_progress: e.target.value })}
                    placeholder="Track your progress with this company"
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={companyForm.notes}
                    onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                    placeholder="Any notes about the company"
                    rows="3"
                  />
                </div>

                {message && <div className="message">{message}</div>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCompanyModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCompany ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Contact Modal */}
        {showContactModal && (
          <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Add Contact to {selectedCompany?.name}</h2>
              <form onSubmit={handleContactSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={contactForm.position}
                    onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                    placeholder="e.g., Analyst, Associate, VP"
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., PDT, BAM, Event, Referral"
                    onChange={(e) => setContactForm({
                      ...contactForm,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                    })}
                  />
                </div>

                <div className="form-group">
                  <label>Initial Note</label>
                  <textarea
                    value={contactForm.initial_note}
                    onChange={(e) => setContactForm({ ...contactForm, initial_note: e.target.value })}
                    placeholder="Met at networking event, discussed..."
                    rows="3"
                  />
                </div>

                {message && <div className="message">{message}</div>}

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Contact
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Companies;
