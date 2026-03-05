import React from 'react';

export default function StepIndicator({ current }) {
  return (
    <div className="steps-bar">
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && <div className={`step-line${current > n - 1 ? ' done' : ''}`} />}
          <div className={`step-dot${n === current ? ' active' : n < current ? ' done' : ''}`}>
            {n}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
