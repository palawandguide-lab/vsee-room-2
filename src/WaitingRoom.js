import React, { useEffect, useState } from 'react';

export default function WaitingRoom({ videoCallUrl, waitingRoomUrl }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!videoCallUrl) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = videoCallUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [videoCallUrl]);

  return (
    <>
      <div className="card">
        {videoCallUrl ? (
          <div className="redirecting">
            <div className="loader loader-dark" />
            <p>Redirecting you to your video visit…</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', margin: '8px 0' }}>
              {countdown}
            </p>
            <small>You'll be redirected automatically. If not, click below.</small>
          </div>
        ) : (
          <div className="waiting-room">
            <div className="waiting-anim">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1a6b5a" strokeWidth="2" strokeLinecap="round">
                <path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <h2>You're in the Waiting Room</h2>
            <p>Your provider has been notified. Please stay on this page — your visit will begin shortly.</p>
            <div className="wait-info">
              <div>
                <span className="num">1</span>
                <span className="label">Queue Position</span>
              </div>
              <div>
                <span className="num">~5 min</span>
                <span className="label">Est. Wait</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        {videoCallUrl ? (
          <a href={videoCallUrl} className="btn btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            Join Video Call Now
          </a>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Setting up your visit…
          </p>
        )}
        {waitingRoomUrl && (
          <a href={waitingRoomUrl} className="btn btn-outline" style={{ marginTop: '10px' }}>
            Open VSee Waiting Room
          </a>
        )}
      </div>
    </>
  );
}
