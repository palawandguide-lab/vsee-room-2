import React, { useState, useCallback } from 'react';
import './App.css';
import StepIndicator from './StepIndicator';
import ScanStep from './ScanStep';
import PatientForm from './PatientForm';
import WaitingRoom from './WaitingRoom';
import { createVisit } from './vseeApi';

function Toast({ message }) {
  if (!message) return null;
  return <div className={`toast${message ? ' show' : ''}`}>{message}</div>;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [scanData, setScanData] = useState({});
  const [scanImage, setScanImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');
  const [videoCallUrl, setVideoCallUrl] = useState(null);
  const [waitingRoomUrl, setWaitingRoomUrl] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }, []);

  // ── Step 1 handlers ──
  const handleScanComplete = (data) => {
    const { imageData, ...fields } = data;
    setScanData(fields);
    if (imageData) setScanImage(imageData);
    setStep(2);
    showToast(imageData ? 'ID scanned — please verify your details.' : 'Please enter your details manually.');
  };

  const handleSkip = () => {
    setScanData({});
    setScanImage(null);
    setStep(2);
  };

  // ── Step 2: Submit → Netlify function → redirect ──
  const handleFormSubmit = async (formData) => {
    setError(null);
    setLoading(true);

    try {
      const result = await createVisit(formData);

      setVideoCallUrl(result.videoCallUrl);
      setWaitingRoomUrl(result.waitingRoomUrl);
      setStep(3);
      showToast('Visit created! Redirecting to your provider…');

    } catch (err) {
      console.error('Error:', err);
      setError(`${err.message}. Please try again or contact the front desk.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="header">
        <div className="header-logo">
          <svg viewBox="0 0 36 36" fill="none" width="36" height="36">
            <rect width="36" height="36" rx="10" fill="#1a6b5a"/>
            <path d="M10 18c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="18" cy="18" r="3" fill="#d4a853"/>
          </svg>
          <span>TeleCare</span>
        </div>
        <p>Virtual Waiting Room — Powered by VSee</p>
      </div>

      <StepIndicator current={step} />

      {step === 1 && (
        <ScanStep onScanComplete={handleScanComplete} onSkip={handleSkip} />
      )}

      {step === 2 && (
        <PatientForm
          initialData={scanData}
          scanImage={scanImage}
          onSubmit={handleFormSubmit}
          loading={loading}
          error={error}
        />
      )}

      {step === 3 && (
        <WaitingRoom videoCallUrl={videoCallUrl} waitingRoomUrl={waitingRoomUrl} />
      )}

      <Toast message={toast} />
    </div>
  );
}
