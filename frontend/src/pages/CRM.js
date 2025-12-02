import { useState, useEffect, useMemo } from 'react';
import Layout from '../components/Layout';
import { contactsAPI } from '../api/contacts';
import { companiesAPI } from '../api/companies';
import './CRM.css';

function CRM() {
  const [contacts, setContacts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('firms'); // 'firms' or 'contacts'
  const [expandedFirmId, setExpandedFirmId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, status, company, lastContact
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedCompanyForEvent, setSelectedCompanyForEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, companiesData, eventsData] = await Promise.all([
        contactsAPI.getAll(),
        companiesAPI.getAll(),
        eventsAPI.getAll({ upcoming: true })
      ]);
      setContacts(contactsData);
      setCompanies(companiesData);
      setEvents(eventsData);
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
      const hitRate = companyContacts.length > 0
        ? Math.round((emailedCount / companyContacts.length) * 100)
        : 0;

      // Get upcoming events for this company
      const companyEvents = events.filter(e => e.company_id === company.id);
      const nextEvent = companyEvents.length > 0 ? companyEvents[0] : null;

      return {
        ...company,
        contactCount: companyContacts.length,
        emailedCount,
        calledCount,
        hitRate,
        contacts: companyContacts,
        upcomingEvents: companyEvents,
        nextEvent
      };
    });
  }, [companies, contacts, events]);

  // Filter and sort contacts for Contacts tab
  const filteredContacts = useMemo(() => {
    let filtered = [...contacts];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.company?.toLowerCase().includes(term) ||
        c.position?.toLowerCase().includes(term)
      );
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
          aVal = a.company?.toLowerCase() || '';
          bVal = b.company?.toLowerCase() || '';
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
  }, [contacts, searchTerm, filterStatus, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const toggleFirm = (firmId) => {
    setExpandedFirmId(expandedFirmId === firmId ? null : firmId);
  };

  const getStatusBadge = (status) => {
    const badges = {
      none: { icon: '🔴', text: 'Not Contacted' },
      emailed: { icon: '🟡', text: 'Emailed' },
      called: { icon: '🟢', text: 'Called' }
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

  const handleAddEvent = (company) => {
    setSelectedCompanyForEvent(company);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventSaved = () => {
    setShowEventModal(false);
    loadData(); // Reload to get new events
  };

  if (loading) {
    return (
      <Layout>
        <div className="crm-loading">
          <div className="spinner"></div>
          <p>Loading your network...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="crm-container">
        {/* FIRMS TAB */}
        {activeTab === 'firms' && (
          <div className="firms-view">
            <div className="crm-header">
              <h1>Firms</h1>
              <div className="header-stats">
                <span className="stat-pill">🏢 {companies.length} firms</span>
                <button className="btn btn-secondary" onClick={() => setActiveTab('contacts')}>
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
                            <span className="stat">📊 {firm.hitRate}% hit rate</span>
                          </div>
                          {firm.nextEvent && (
                            <div className="firm-next-event">
                              📅 Next: {firm.nextEvent.title} ({formatDate(firm.nextEvent.start_time)})
                            </div>
                          )}
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
                                handleAddEvent(firm);
                              }}
                            >
                              📅 Add Event
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
                                      <span className="status-icon">{status.icon}</span>
                                      <div className="contact-details">
                                        <span className="contact-name">{contact.name}</span>
                                        {contact.position && (
                                          <span className="contact-position">({contact.position})</span>
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
                                          onClick={() => window.location.href = `/compose?email=${contact.email}`}
                                          disabled={!contact.email}
                                          title="Send email"
                                        >
                                          ✉️
                                        </button>
                                        <button
                                          className="action-btn"
                                          title="Log call"
                                        >
                                          📞
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
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="contacts-view">
            <div className="crm-header">
              <h1>All Contacts</h1>
              <div className="header-stats">
                <span className="stat-pill">👥 {contacts.length} contacts</span>
                <button className="btn btn-secondary" onClick={() => setActiveTab('firms')}>
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
                            <span className="status-badge" title={status.text}>
                              {status.icon}
                            </span>
                          </td>
                          <td className="name-cell">{contact.name}</td>
                          <td>{contact.company || '—'}</td>
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
                                onClick={() => window.location.href = `/compose?email=${contact.email}`}
                                disabled={!contact.email}
                                title="Send email"
                              >
                                ✉️
                              </button>
                              <button className="action-btn" title="Log call">📞</button>
                              <button className="action-btn" title="Add note">📝</button>
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
        )}

        {/* Event Modal */}
        {showEventModal && (
          <EventModal
            company={selectedCompanyForEvent}
            event={editingEvent}
            onSave={handleEventSaved}
            onClose={() => setShowEventModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}

export default CRM;
