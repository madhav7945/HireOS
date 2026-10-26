import React, { useState } from 'react';

const MOCK_QUESTIONS = [
  "Implement a function that finds the longest palindromic substring in a given string.",
  "How would you optimize a React application that is experiencing slow rendering?",
  "Explain the difference between SQL and NoSQL databases, and when to use each.",
  "Write a function to reverse a linked list.",
  "Describe your experience with CI/CD pipelines."
];

export default function QuestionPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="question-panel-container">
      <div className="question-header">
        <h3>🤖 AI Question Panel</h3>
        <span className="question-counter">Q{currentIndex + 1}/{MOCK_QUESTIONS.length}</span>
      </div>
      <div className="question-content">
        <p>{MOCK_QUESTIONS[currentIndex]}</p>
      </div>
      <div className="question-navigation">
        <button 
          className="btn btn-secondary" 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(prev => prev - 1)}
        >
          [Previous]
        </button>
        <button 
          className="btn btn-primary"
          disabled={currentIndex === MOCK_QUESTIONS.length - 1}
          onClick={() => setCurrentIndex(prev => prev + 1)}
        >
          [Next Question]
        </button>
      </div>
    </div>
  );
}
