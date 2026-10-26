import React, { useState } from 'react';

export default function CodeSandbox() {
  const [language, setLanguage] = useState('Python');
  const [code, setCode] = useState('def solution():\n    # Write code here...\n    pass');

  return (
    <div className="code-sandbox-container">
      <div className="code-sandbox-header">
        <div className="language-selector">
          <span>Language:</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>Python</option>
            <option>JavaScript</option>
            <option>Java</option>
            <option>C++</option>
          </select>
        </div>
      </div>
      <div className="code-editor-wrapper">
        <textarea
          className="code-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck="false"
        />
      </div>
      <div className="code-sandbox-actions">
        <button className="btn btn-secondary">▶ Run</button>
        <button className="btn btn-primary">Submit</button>
      </div>
    </div>
  );
}
