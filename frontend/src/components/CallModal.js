import { useState } from 'react';
import { contactsAPI } from '../api/contacts';
import './EventModal.css'; // Reuse the same modal styles

function CallModal({ contact, onSave, onClose }) {
  const [formData, setFormData] = useState({
    duration: '',
    quality: '',
    note: '',
    next_followup_date: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const callData = {
        duration: formData.duration ? parseInt(formData.duration) : null,
        quality: formData.quality || null,
        note: formData.note || null,
        next_followup_date: formData.next_followup_date || null
      };

      await contactsAPI.logCall(contact.id, callData);
      onSave();
    } catch (err) {
      console.error('Error logging call:', err);
      setError(err.response?.data?.error || 'Failed to log call');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Log Call with {contact.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            color: '#c33',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 15"
            />
          </div>

          <div className="form-group">
            <label>Call Quality</label>
            <select
              value={formData.quality}
              onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
            >
              <option value="">Select quality...</option>
              <option value="good">⭐⭐⭐ Good</option>
              <option value="okay">⭐⭐ Okay</option>
              <option value="poor">⭐ Poor</option>
            </select>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="What did you discuss? Any key takeaways?"
              rows="4"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label>Next Follow-up Date (Optional)</label>
            <input
              type="date"
              value={formData.next_followup_date}
              onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="modal-actions">
            <div className="modal-actions-right">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Logging Call...' : 'Log Call'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CallModal;
