import React from 'react';
import { useNavigate } from 'react-router-dom';
import VideoFeed from '../components/ai-interview/VideoFeed';
import CodeSandbox from '../components/ai-interview/CodeSandbox';
import QuestionPanel from '../components/ai-interview/QuestionPanel';
import ScoringPanel from '../components/ai-interview/ScoringPanel';
import './AIInterviewRoom.css';
import { ChevronLeft } from 'lucide-react';

export default function AIInterviewRoom() {
  const navigate = useNavigate();

  return (
    <div className="ai-interview-page">
      <header className="ai-interview-header">
        <div className="ai-interview-header-left">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <ChevronLeft size={16} /> Back
          </button>
          <h2>HireOS AI Interview</h2>
        </div>
        <div className="ai-interview-header-center">
          <span className="candidate-name">Candidate: Arjun Patel</span>
        </div>
        <div className="ai-interview-header-right">
          <span className="interview-timer">⏱ 00:28:14</span>
          <button className="btn btn-danger">End Interview</button>
        </div>
      </header>

      <div className="ai-interview-grid">
        <div className="panel video-panel">
          <VideoFeed />
        </div>
        <div className="panel code-panel">
          <CodeSandbox />
        </div>
        <div className="panel question-panel">
          <QuestionPanel />
        </div>
        <div className="panel scoring-panel">
          <ScoringPanel />
        </div>
      </div>
    </div>
  );
}
