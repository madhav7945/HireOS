import React from 'react';

const SCORES = [
  { category: 'Code Quality', score: 78 },
  { category: 'Communication', score: 65 },
  { category: 'Problem Solve', score: 82 },
  { category: 'Confidence', score: 70 },
  { category: 'Overall', score: 74, isOverall: true }
];

export default function ScoringPanel() {
  return (
    <div className="scoring-panel-container">
      <h3 className="scoring-header">📊 Real-Time Scoring</h3>
      <div className="scores-list">
        {SCORES.map((item, index) => (
          <div key={index} className={`score-item ${item.isOverall ? 'overall-score' : ''}`}>
            <span className="score-category">{item.category}:</span>
            <div className="score-bar-bg">
              <div 
                className="score-bar-fill" 
                style={{ width: `${item.score}%`, backgroundColor: item.isOverall ? 'var(--brand-primary)' : 'var(--brand-primary-light)' }}
              />
            </div>
            <span className="score-value">{item.score}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
