import { useState, useEffect } from 'react';
import { contactsAPI } from '../api/contacts';
import './Timeline.css';

function Timeline({ contactId, contact }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [contactId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await contactsAPI.getNotes(contactId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      setSaving(true);
      await contactsAPI.addNote(contactId, {
        type: 'general',
        content: newNote
      });
      setNewNote('');
      setShowAddNote(false);
      await loadNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await contactsAPI.deleteNote(noteId);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      email: '✉️',
      call: '📞',
      general: '📝'
    };
    return icons[type] || '📝';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <div className="timeline-container">
        <div className="timeline-loading">
          <div className="spinner-small"></div>
          <p>Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>Timeline</h3>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => setShowAddNote(!showAddNote)}
        >
          {showAddNote ? 'Cancel' : '+ Add Note'}
        </button>
      </div>

      {showAddNote && (
        <div className="timeline-add-note">
          <form onSubmit={handleAddNote}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note about your interaction..."
              rows="3"
              autoFocus
              disabled={saving}
            />
            <div className="timeline-add-actions">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowAddNote(false);
                  setNewNote('');
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={saving || !newNote.trim()}
              >
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="timeline-empty">
          <div className="timeline-empty-icon">📝</div>
          <p>No interactions yet</p>
          <p className="timeline-empty-hint">
            Send an email, log a call, or add a note to start tracking your interactions with {contact?.name || 'this contact'}
          </p>
        </div>
      ) : (
        <div className="timeline-list">
          {notes.map((note) => (
            <div key={note.id} className={`timeline-item timeline-type-${note.type}`}>
              <div className="timeline-icon">
                {getTypeIcon(note.type)}
              </div>
              <div className="timeline-content">
                <div className="timeline-text">{note.content}</div>
                <div className="timeline-meta">
                  <span className="timeline-time">{formatTimestamp(note.created_at)}</span>
                  {note.type === 'general' && (
                    <button
                      className="timeline-delete"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete note"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Timeline;
