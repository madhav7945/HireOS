import React from 'react';

export default function VideoFeed() {
  return (
    <div className="video-feed-container">
      <div className="video-feed-placeholder">
        <div className="webcam-icon">📹</div>
        <span>Camera Active</span>
      </div>
      <div className="biometric-status">
        <h4>Biometric Status</h4>
        <div className="status-item success">✅ Face Detected</div>
        <div className="status-item success">✅ Single Person</div>
        <div className="status-item warning">⚠️ Tab Switch: 2</div>
        <div className="status-item success">✅ Audio Normal</div>
      </div>
    </div>
  );
}
