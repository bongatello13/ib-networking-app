import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { templatesAPI } from '../api/templates';
import { useNavigate } from 'react-router-dom';

function TemplateModal({ template, onClose, onSave }) {
  const [formData, setFormData] = useState(template || {
    name: '',
    subject: '',
    body: '',
    category: 'initial'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{template ? 'Edit Template' : 'Create Template'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '12px 16px', border: '2px solid #e1e8ed', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="initial">Initial Outreach</option>
              <option value="followup">Follow-up</option>
              <option value="general">General</option>
            </select>
          </div>

          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Use {{variable_name}} for variables"
              required
            />
          </div>

          <div className="form-group">
            <label>Body</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              style={{ minHeight: '200px' }}
              placeholder="Use {{variable_name}} for variables, e.g., {{banker_name}}, {{bank_name}}"
              required
            />
          </div>

          <div style={{ color: '#7f8c8d', fontSize: '14px', marginBottom: '20px' }}>
            <strong>Tip:</strong> Use double curly braces for variables: <code>{'{{banker_name}}'}</code>, <code>{'{{bank_name}}'}</code>, <code>{'{{school}}'}</code>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ width: 'auto' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await templatesAPI.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingTemplate) {
        await templatesAPI.update(editingTemplate.id, formData);
      } else {
        await templatesAPI.create(formData);
      }
      setShowModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await templatesAPI.delete(id);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const handleUse = (template) => {
    navigate('/compose', { state: { template } });
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Email Templates</h1>
        <p>Create and manage your email templates</p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <button 
          onClick={() => {
            setEditingTemplate(null);
            setShowModal(true);
          }} 
          className="btn btn-primary" 
          style={{ width: 'auto' }}
        >
          + Create Template
        </button>
      </div>

      {loading ? (
        <div>Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <h3>No Templates Yet</h3>
            <p>Create your first email template to get started</p>
            <button 
              onClick={() => setShowModal(true)} 
              className="btn btn-primary" 
              style={{ width: 'auto' }}
            >
              Create Template
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Subject</th>
                  <th>Variables</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td><strong>{template.name}</strong></td>
                    <td>
                      <span className={`badge badge-${template.category}`}>
                        {template.category}
                      </span>
                    </td>
                    <td>{template.subject}</td>
                    <td>
                      {template.variables && template.variables.length > 0 ? (
                        template.variables.map(v => `{{${v}}}`).join(', ')
                      ) : (
                        <span style={{ color: '#95a5a6' }}>No variables</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => handleUse(template)} 
                          className="btn-small btn-use"
                        >
                          Use
                        </button>
                        <button 
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowModal(true);
                          }} 
                          className="btn-small btn-edit"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(template.id)} 
                          className="btn-small btn-delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSave}
        />
      )}
    </Layout>
  );
}

export default Templates;
