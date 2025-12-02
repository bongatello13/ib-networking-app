import React, { useState } from 'react';
import './EventModal.css';

function EventDetailModal({
  isOpen,
  onClose,
  event,
  onEventUpdated,
  onEventDeleted,
  companies
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    event_type: event.event_type || 'other',
    start_time: formatDateForInput(event.start_time),
    end_time: formatDateForInput(event.end_time),
    location: event.location || '',
    company_id: event.company_id || '',
    contact_id: event.contact_id || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function formatDateForInput(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          company_id: formData.company_id || null,
          contact_id: formData.contact_id || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }

      const updatedEvent = await response.json();
      onEventUpdated(updatedEvent);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/events/${event.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete event');
      }

      onEventDeleted(event.id);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      coffee_chat: 'Coffee Chat',
      networking_event: 'Networking Event',
      phone_call: 'Phone Call',
      info_session: 'Info Session',
      interview: 'Interview',
      deadline: 'Deadline',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getEventTypeColor = (type) => {
    const colors = {
      coffee_chat: '#3B82F6',
      networking_event: '#10B981',
      phone_call: '#F59E0B',
      info_session: '#06B6D4',
      interview: '#EF4444',
      deadline: '#8B5CF6',
      other: '#6B7280'
    };
    return colors[type] || colors.other;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Event' : 'Event Details'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-alert">
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdate} className="event-form">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="event_type">Event Type *</label>
              <select
                id="event_type"
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                required
              >
                <option value="coffee_chat">Coffee Chat</option>
                <option value="networking_event">Networking Event</option>
                <option value="phone_call">Phone Call</option>
                <option value="info_session">Info Session</option>
                <option value="interview">Interview</option>
                <option value="deadline">Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_time">Start Time *</label>
                <input
                  type="datetime-local"
                  id="start_time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end_time">End Time *</label>
                <input
                  type="datetime-local"
                  id="end_time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="event-details">
            <div className="event-type-badge" style={{ backgroundColor: getEventTypeColor(event.event_type) }}>
              {getEventTypeLabel(event.event_type)}
            </div>

            <h3 className="event-title">{event.title}</h3>

            <div className="event-info-grid">
              <div className="event-info-item">
                <span className="info-label">📅 Start</span>
                <span className="info-value">{formatDateForDisplay(event.start_time)}</span>
              </div>

              <div className="event-info-item">
                <span className="info-label">🕐 End</span>
                <span className="info-value">{formatDateForDisplay(event.end_time)}</span>
              </div>

              {event.location && (
                <div className="event-info-item">
                  <span className="info-label">📍 Location</span>
                  <span className="info-value">{event.location}</span>
                </div>
              )}

              {event.companies && (
                <div className="event-info-item">
                  <span className="info-label">🏢 Company</span>
                  <span className="info-value">{event.companies.name}</span>
                </div>
              )}

              {event.contacts && (
                <div className="event-info-item">
                  <span className="info-label">👤 Contact</span>
                  <span className="info-value">
                    {event.contacts.name}
                    {event.contacts.position && ` - ${event.contacts.position}`}
                  </span>
                </div>
              )}

              {event.google_calendar_link && (
                <div className="event-info-item">
                  <span className="info-label">🔗 Google Calendar</span>
                  <a
                    href={event.google_calendar_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="info-link"
                  >
                    View in Google Calendar
                  </a>
                </div>
              )}
            </div>

            {event.description && (
              <div className="event-description">
                <h4>Description</h4>
                <p>{event.description}</p>
              </div>
            )}

            <div className="modal-actions">
              <button
                onClick={handleDelete}
                className="btn-danger"
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Event'}
              </button>
              <div className="modal-actions-right">
                <button
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                >
                  Edit Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventDetailModal;
