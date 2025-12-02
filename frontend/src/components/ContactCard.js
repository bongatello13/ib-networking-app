import { useState } from 'react';
import { contactsAPI } from '../api/contacts';
import './ContactCard.css';

function ContactCard({ contact, isExpanded, onClick, onUpdate }) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);

  const getStatusBadge = (status) => {
    const badges = {
      none: { icon: '🔴', text: 'Not Contacted', class: 'status-none' },
      emailed: { icon: '🟡', text: 'Emailed', class: 'status-emailed' },
      called: { icon: '🟢', text: 'Called', class: 'status-called' }
    };
    return badges[status] || badges.none;
  };

  const getQualityStars = (quality) => {
    const stars = {
      good: '⭐⭐⭐',
      okay: '⭐⭐',
      poor: '⭐'
    };
    return stars[quality] || '';
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleQuickAction = async (action, e) => {
    e.stopPropagation();

    if (action === 'email') {
      window.location.href = `/compose?email=${contact.email}`;
    } else if (action === 'call') {
      try {
        setLoading(true);
        await contactsAPI.logCall(contact.id, {
          note: 'Phone call made'
        });
        onUpdate();
      } catch (error) {
        console.error('Error logging call:', error);
      } finally {
        setLoading(false);
      }
    } else if (action === 'note') {
      setShowNoteInput(true);
    }
  };

  const handleAddNote = async (e) => {
    e.stopPropagation();
    if (!noteText.trim()) return;

    try {
      setLoading(true);
      await contactsAPI.addNote(contact.id, {
        type: 'general',
        content: noteText
      });
      setNoteText('');
      setShowNoteInput(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = getStatusBadge(contact.status);
  const lastContactText = formatDate(contact.last_contact_date);

  return (
    <div className={`contact-card ${isExpanded ? 'expanded' : ''}`} onClick={onClick}>
      <div className="card-header">
        <div className="contact-avatar">
          {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="contact-info">
          <h3 className="contact-name">{contact.name}</h3>
          {contact.position && <p className="contact-position">{contact.position}</p>}
          {contact.company && <p className="contact-company">🏢 {contact.company}</p>}
        </div>
      </div>

      <div className="card-meta">
        <span className={`status-badge ${statusBadge.class}`}>
          {statusBadge.icon} {statusBadge.text}
        </span>
        {contact.quality && (
          <span className="quality-badge">{getQualityStars(contact.quality)}</span>
        )}
      </div>

      {lastContactText && (
        <div className="last-contact">
          Last contact: {lastContactText}
        </div>
      )}

      {contact.tags && contact.tags.length > 0 && (
        <div className="contact-tags">
          {contact.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="tag">{tag}</span>
          ))}
          {contact.tags.length > 3 && (
            <span className="tag tag-more">+{contact.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="action-btn action-email"
          onClick={(e) => handleQuickAction('email', e)}
          title="Send email"
          disabled={!contact.email}
        >
          ✉️
        </button>
        <button
          className="action-btn action-call"
          onClick={(e) => handleQuickAction('call', e)}
          title="Log call"
        >
          📞
        </button>
        <button
          className="action-btn action-note"
          onClick={(e) => handleQuickAction('note', e)}
          title="Add note"
        >
          📝
        </button>
      </div>

      {isExpanded && (
        <div className="card-details" onClick={(e) => e.stopPropagation()}>
          <div className="detail-section">
            <h4>Contact Details</h4>
            {contact.email && (
              <div className="detail-row">
                <span className="detail-label">Email:</span>
                <a href={`mailto:${contact.email}`} className="detail-value">{contact.email}</a>
              </div>
            )}
            {contact.phone && (
              <div className="detail-row">
                <span className="detail-label">Phone:</span>
                <span className="detail-value">{contact.phone}</span>
              </div>
            )}
            {contact.linkedin && (
              <div className="detail-row">
                <span className="detail-label">LinkedIn:</span>
                <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="detail-value">
                  View Profile
                </a>
              </div>
            )}
          </div>

          {contact.notes && (
            <div className="detail-section">
              <h4>Notes</h4>
              <p className="detail-notes">{contact.notes}</p>
            </div>
          )}

          {showNoteInput ? (
            <div className="note-input-section">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows="3"
                autoFocus
              />
              <div className="note-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteInput(false);
                    setNoteText('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || loading}
                >
                  {loading ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="detail-actions">
            <button
              className="btn btn-outline"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/contacts?id=${contact.id}`;
              }}
            >
              View Full Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactCard;
