import { useState } from 'react';
import { companiesAPI } from '../api/companies';
import './CompanyCard.css';

function CompanyCard({ company, isExpanded, onClick, onUpdate }) {
  const getRankingBadge = (ranking) => {
    const badges = {
      'Heavy Target': { icon: '🎯', text: 'Heavy Target', class: 'ranking-heavy' },
      'Target': { icon: '🔵', text: 'Target', class: 'ranking-target' },
      'Lower Priority': { icon: '⚪', text: 'Lower Priority', class: 'ranking-low' }
    };
    return badges[ranking] || badges['Target'];
  };

  const rankingBadge = getRankingBadge(company.ranking);
  const contactCount = company.contact_count || 0;

  return (
    <div className={`company-card ${isExpanded ? 'expanded' : ''}`} onClick={onClick}>
      <div className="card-header">
        <div className="company-icon">
          🏢
        </div>
        <div className="company-info">
          <h3 className="company-name">{company.name}</h3>
          {company.industry && <p className="company-industry">{company.industry}</p>}
        </div>
      </div>

      <div className="card-meta">
        <span className={`ranking-badge ${rankingBadge.class}`}>
          {rankingBadge.icon} {rankingBadge.text}
        </span>
      </div>

      <div className="company-stats">
        <div className="stat-item">
          <span className="stat-icon">👥</span>
          <span className="stat-text">{contactCount} contact{contactCount !== 1 ? 's' : ''}</span>
        </div>
        {company.sector && (
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <span className="stat-text">{company.sector}</span>
          </div>
        )}
      </div>

      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="action-btn action-add"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = `/companies?addContact=${company.id}`;
          }}
          title="Add contact"
        >
          + Contact
        </button>
      </div>

      {isExpanded && (
        <div className="card-details" onClick={(e) => e.stopPropagation()}>
          {company.results_progress && (
            <div className="detail-section">
              <h4>Progress</h4>
              <p className="detail-text">{company.results_progress}</p>
            </div>
          )}

          {company.notes && (
            <div className="detail-section">
              <h4>Notes</h4>
              <p className="detail-text">{company.notes}</p>
            </div>
          )}

          <div className="detail-actions">
            <button
              className="btn btn-outline"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/companies?id=${company.id}`;
              }}
            >
              View Full Details
            </button>
            <button
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/companies?addContact=${company.id}`;
              }}
            >
              Add Contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyCard;
