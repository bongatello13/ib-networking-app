import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { contactsAPI } from '../api/contacts';

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    linkedin: '',
    company: '',
    position: '',
    group_affiliation: '',
    timeline: '',
    notes: '',
    status: 'not_contacted'
  });

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, statusFilter]);

  const loadContacts = async () => {
    try {
      const data = await contactsAPI.getAll();
      setContacts(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.name.toLowerCase().includes(term) ||
        contact.email?.toLowerCase().includes(term) ||
        contact.company?.toLowerCase().includes(term) ||
        contact.position?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(contact => contact.status === statusFilter);
    }

    setFilteredContacts(filtered);
  };

  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        linkedin: contact.linkedin || '',
        company: contact.company || '',
        position: contact.position || '',
        group_affiliation: contact.group_affiliation || '',
        timeline: contact.timeline || '',
        notes: contact.notes || '',
        status: contact.status || 'not_contacted'
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: '',
        email: '',
        linkedin: '',
        company: '',
        position: '',
        group_affiliation: '',
        timeline: '',
        notes: '',
        status: 'not_contacted'
      });
    }
    setShowModal(true);
    setMessage('');
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      linkedin: '',
      company: '',
      position: '',
      group_affiliation: '',
      timeline: '',
      notes: '',
      status: 'not_contacted'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData);
        setMessage('Contact updated successfully!');
      } else {
        await contactsAPI.create(formData);
        setMessage('Contact created successfully!');
      }

      await loadContacts();
      closeModal();
    } catch (error) {
      setMessage('Error saving contact: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await contactsAPI.delete(id);
      await loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'not_contacted':
        return '#95a5a6';
      case 'emailed':
        return '#3498db';
      case 'called':
        return '#9b59b6';
      case 'follow_up_needed':
        return '#e67e22';
      default:
        return '#95a5a6';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'not_contacted':
        return 'Not Contacted';
      case 'emailed':
        return 'Emailed';
      case 'called':
        return 'Called';
      case 'follow_up_needed':
        return 'Follow-up Needed';
      default:
        return status;
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
        <h1>Contacts</h1>
        <p>Manage your networking contacts</p>
      </div>

      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          borderRadius: '6px',
          background: message.includes('Error') ? '#fee' : '#efe',
          color: message.includes('Error') ? '#c33' : '#363',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Contact List ({filteredContacts.length})</h2>
          <button onClick={() => openModal()} className="btn btn-primary">
            Add New Contact
          </button>
        </div>

        {/* Search and Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name, email, company, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '2px solid #e1e8ed',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 12px',
              border: '2px solid #e1e8ed',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="not_contacted">Not Contacted</option>
            <option value="emailed">Emailed</option>
            <option value="called">Called</option>
            <option value="follow_up_needed">Follow-up Needed</option>
          </select>
        </div>

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#657786' }}>
            {contacts.length === 0
              ? 'No contacts yet. Click "Add New Contact" to get started!'
              : 'No contacts match your search criteria.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                style={{
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#f7f9fa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{contact.name}</h3>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          color: 'white',
                          background: getStatusBadgeColor(contact.status)
                        }}
                      >
                        {getStatusLabel(contact.status)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                      {contact.email && (
                        <div style={{ fontSize: '14px', color: '#14171a' }}>
                          <strong>Email:</strong> {contact.email}
                        </div>
                      )}
                      {contact.company && (
                        <div style={{ fontSize: '14px', color: '#14171a' }}>
                          <strong>Company:</strong> {contact.company}
                        </div>
                      )}
                      {contact.position && (
                        <div style={{ fontSize: '14px', color: '#14171a' }}>
                          <strong>Position:</strong> {contact.position}
                        </div>
                      )}
                      {contact.group_affiliation && (
                        <div style={{ fontSize: '14px', color: '#14171a' }}>
                          <strong>Group:</strong> {contact.group_affiliation}
                        </div>
                      )}
                      {contact.timeline && (
                        <div style={{ fontSize: '14px', color: '#14171a' }}>
                          <strong>Timeline:</strong> {contact.timeline}
                        </div>
                      )}
                    </div>

                    {contact.linkedin && (
                      <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                        <a
                          href={contact.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#0077b5', textDecoration: 'none' }}
                        >
                          View LinkedIn Profile →
                        </a>
                      </div>
                    )}

                    {contact.notes && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#657786',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <strong style={{ color: '#14171a' }}>Notes:</strong><br />
                        {contact.notes}
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: '#657786', marginTop: '8px' }}>
                      Last updated: {new Date(contact.updated_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      onClick={() => openModal(contact)}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '13px', background: '#3498db' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="btn"
                      style={{ padding: '6px 12px', fontSize: '13px', background: '#e74c3c' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Create/Edit Contact */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="John Doe"
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
                <label>LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/johndoe"
                />
              </div>

              <div className="form-group">
                <label>Company</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Goldman Sachs"
                />
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
                <label>Group/Affiliation</label>
                <input
                  type="text"
                  value={formData.group_affiliation}
                  onChange={(e) => setFormData({ ...formData, group_affiliation: e.target.value })}
                  placeholder="Finance Club, Class of 2024"
                />
              </div>

              <div className="form-group">
                <label>Timeline</label>
                <input
                  type="text"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  placeholder="Summer 2024, Q1 2025"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="not_contacted">Not Contacted</option>
                  <option value="emailed">Emailed</option>
                  <option value="called">Called</option>
                  <option value="follow_up_needed">Follow-up Needed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any relevant notes about this contact..."
                  style={{ minHeight: '120px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }}>
                  {editingContact ? 'Update Contact' : 'Create Contact'}
                </button>
                <button type="button" onClick={closeModal} className="btn" style={{ flex: 1, background: '#657786' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default Contacts;
