import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { contactsAPI } from '../api/contacts';
import { companiesAPI } from '../api/companies';
import './CRM.css';

function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_id: '',
    position: '',
    status: 'none',
    quality: '',
    notes: '',
    email_notes: '',
    call_notes: '',
    email_date: '',
    phone_date: ''
  });
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
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
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        const companyName = companies.find(comp => comp.id === c.company_id)?.name || '';
        return c.name?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          companyName.toLowerCase().includes(term) ||
          c.position?.toLowerCase().includes(term);
      });
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'name':
          aVal = a.name?.toLowerCase() || '';
          bVal = b.name?.toLowerCase() || '';
          break;
        case 'company':
          const aCompany = companies.find(c => c.id === a.company_id);
          const bCompany = companies.find(c => c.id === b.company_id);
          aVal = aCompany?.name?.toLowerCase() || '';
          bVal = bCompany?.name?.toLowerCase() || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'lastContact':
          aVal = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
          bVal = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contacts, companies, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      none: { text: 'Not Contacted', className: 'status-none' },
      emailed: { text: 'Emailed', className: 'status-emailed' },
      called: { text: 'Called', className: 'status-called' }
    };
    return badges[status] || badges.none;
  };

  const getCompanyName = (companyId) => {
    if (!companyId) return '—';
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : '—';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        company_id: contact.company_id || '',
        position: contact.position || '',
        status: contact.status || 'none',
        quality: contact.quality || '',
        notes: contact.notes || '',
        email_notes: contact.email_notes || '',
        call_notes: contact.call_notes || '',
        email_date: contact.email_date ? contact.email_date.split('T')[0] : '',
        phone_date: contact.phone_date ? contact.phone_date.split('T')[0] : ''
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_id: '',
        position: '',
        status: 'none',
        quality: '',
        notes: '',
        email_notes: '',
        call_notes: '',
        email_date: '',
        phone_date: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_id: '',
      position: '',
      status: 'none',
      quality: '',
      notes: '',
      email_notes: '',
      call_notes: '',
      email_date: '',
      phone_date: ''
    });
    setShowNewCompanyForm(false);
    setNewCompanyData({ name: '', ranking: 'Target' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData);
      } else {
        await contactsAPI.create(formData);
      }
      await loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (contact) => {
    if (!window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
      return;
    }
    try {
      await contactsAPI.delete(contact.id);
      await loadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleCompanySelectChange = (e) => {
    const value = e.target.value;
    if (value === '__create_new__') {
      setShowNewCompanyForm(true);
      setFormData({ ...formData, company_id: '' });
    } else {
      setFormData({ ...formData, company_id: value });
    }
  };

  const handleCreateNewCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyData.name.trim()) {
      alert('Company name is required');
      return;
    }

    try {
      const newCompany = await companiesAPI.create(newCompanyData);
      // Reload companies list
      const companiesData = await companiesAPI.getAll();
      setCompanies(companiesData);
      // Auto-select the newly created company
      setFormData({ ...formData, company_id: newCompany.id });
      // Reset and hide the new company form
      setNewCompanyData({ name: '', ranking: 'Target' });
      setShowNewCompanyForm(false);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company: ' + (error.response?.data?.error || error.message));
    }
  };

  const cancelNewCompany = () => {
    setShowNewCompanyForm(false);
    setNewCompanyData({ name: '', ranking: 'Target' });
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
          <p>Loading your contacts...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="crm-container">
        <div className="contacts-view">
          <div className="crm-header">
            <h1>All Contacts</h1>
            <div className="header-stats">
              <span className="stat-pill">👥 {contacts.length} contacts</span>
              <button className="btn btn-primary" onClick={() => openModal()}>
                + Add Contact
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/firms')}>
                View Firms
              </button>
            </div>
          </div>

          <div className="contacts-controls">
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
              )}
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Status</option>
              <option value="none">Not Contacted</option>
              <option value="emailed">Emailed</option>
              <option value="called">Called</option>
            </select>
          </div>

          {filteredContacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No contacts found</h3>
              <p>{searchTerm ? `No results for "${searchTerm}"` : 'Add your first contact to get started'}</p>
            </div>
          ) : (
            <div className="contacts-table-wrapper">
              <table className="contacts-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('status')} className="sortable">
                      Status {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th onClick={() => handleSort('company')} className="sortable">
                      Company {sortBy === 'company' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>Position</th>
                    <th>Email</th>
                    <th onClick={() => handleSort('lastContact')} className="sortable">
                      Last Contact {sortBy === 'lastContact' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map(contact => {
                    const status = getStatusBadge(contact.status);
                    return (
                      <tr key={contact.id}>
                        <td>
                          <span className={`status-badge ${status.className}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="name-cell">
                          <span className="contact-name">
                            {contact.name}
                          </span>
                        </td>
                        <td>{getCompanyName(contact.company_id)}</td>
                        <td>{contact.position || '—'}</td>
                        <td className="email-cell">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`}>{contact.email}</a>
                          ) : '—'}
                        </td>
                        <td>{formatDate(contact.last_contact_date)}</td>
                        <td>
                          <div className="table-actions">
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
                            <button
                              className="action-btn"
                              onClick={() => openModal(contact)}
                              title="Edit contact"
                            >
                              ✏️
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => handleDelete(contact)}
                              title="Delete contact"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Contact Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>Company</label>
                  {!showNewCompanyForm ? (
                    <>
                      <select
                        value={formData.company_id}
                        onChange={handleCompanySelectChange}
                      >
                        <option value="">Select a company...</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                        <option value="__create_new__" style={{ color: '#1DA1F2', fontWeight: '500' }}>
                          ➕ Create New Company...
                        </option>
                      </select>
                    </>
                  ) : (
                    <div style={{
                      padding: '12px',
                      background: '#f7f9fa',
                      border: '2px solid #1DA1F2',
                      borderRadius: '8px',
                      marginTop: '8px'
                    }}>
                      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#14171a' }}>
                        Create New Company
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={newCompanyData.name}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, name: e.target.value })}
                          placeholder="Goldman Sachs"
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e1e8ed' }}
                          autoFocus
                        />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                          Ranking
                        </label>
                        <select
                          value={newCompanyData.ranking}
                          onChange={(e) => setNewCompanyData({ ...newCompanyData, ranking: e.target.value })}
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #e1e8ed' }}
                        >
                          <option value="Heavy Target">🎯 Heavy Target</option>
                          <option value="Target">🔵 Target</option>
                          <option value="Lower Priority">⚪ Lower Priority</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleCreateNewCompany}
                          className="btn btn-primary"
                          style={{ fontSize: '13px', padding: '6px 12px' }}
                        >
                          Create
                        </button>
                        <button
                          type="button"
                          onClick={cancelNewCompany}
                          className="btn btn-secondary"
                          style={{ fontSize: '13px', padding: '6px 12px' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Investment Banking Analyst"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="none">Not Contacted</option>
                    <option value="emailed">Emailed</option>
                    <option value="called">Called</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Connection Quality</label>
                  <select
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                  >
                    <option value="">Not rated</option>
                    <option value="good">⭐⭐⭐ Good</option>
                    <option value="okay">⭐⭐ Okay</option>
                    <option value="poor">⭐ Poor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Most Recent Email Date</label>
                  <input
                    type="date"
                    value={formData.email_date}
                    onChange={(e) => setFormData({ ...formData, email_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Call Date</label>
                  <input
                    type="date"
                    value={formData.phone_date}
                    onChange={(e) => setFormData({ ...formData, phone_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Notes on Person</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="General notes about this person..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Email Details/Notes</label>
                  <textarea
                    value={formData.email_notes}
                    onChange={(e) => setFormData({ ...formData, email_notes: e.target.value })}
                    placeholder="Notes about email communications..."
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Call Details</label>
                  <textarea
                    value={formData.call_notes}
                    onChange={(e) => setFormData({ ...formData, call_notes: e.target.value })}
                    placeholder="Notes about phone calls..."
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <div className="modal-actions-right">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      {editingContact ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Contact Modal */}
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
                    <span>{getCompanyName(viewingContact.company_id)}</span>
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
                    <span className={`status-badge ${getStatusBadge(viewingContact.status).className}`}>
                      {getStatusBadge(viewingContact.status).text}
                    </span>
                  </div>
                  <div className="view-field">
                    <label>Connection Quality:</label>
                    <span>{viewingContact.quality ? `${viewingContact.quality.charAt(0).toUpperCase() + viewingContact.quality.slice(1)}` : '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Most Recent Email Date:</label>
                    <span>{viewingContact.email_date ? new Date(viewingContact.email_date).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="view-field">
                    <label>Call Date:</label>
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
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    openModal(viewingContact);
                  }}
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

export default Contacts;
