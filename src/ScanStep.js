import React, { useRef, useState, useCallback } from 'react';
import { recognizeImage } from './ocrUtils';

export default function ScanStep({ onScanComplete, onSkip }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      alert('Camera access denied. Please upload a photo instead.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    processImage(imageData);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData) => {
    setProcessing(true);
    stopCamera();
    try {
      const extracted = await recognizeImage(imageData);
      onScanComplete({ ...extracted, imageData });
    } catch {
      onScanComplete({ firstName: '', lastName: '', dob: '', gender: '', address: '', imageData: null });
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="card">
        <div className="processing">
          <div className="loader loader-dark" />
          <p>Reading ID… extracting demographics</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-title">Scan Your ID</div>
        <div className="card-subtitle">
          Use your camera to scan a government-issued photo ID (driver's license, state ID, or passport) to auto-fill your information.
        </div>

        {!cameraActive && (
          <div className="scan-zone" onClick={startCamera}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="10" width="40" height="28" rx="4" stroke="#1a6b5a" strokeWidth="2.5"/>
              <circle cx="24" cy="24" r="6" stroke="#1a6b5a" strokeWidth="2.5"/>
              <path d="M14 10V6h6M34 10V6h-6M14 38v4h6M34 38v4h-6" stroke="#d4a853" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="scan-label">Tap to open camera</span>
            <span className="scan-hint">or upload a photo of your ID below</span>
          </div>
        )}

        {cameraActive && (
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline />
            <div className="camera-overlay">
              <span className="camera-overlay-text">Position ID within frame</span>
            </div>
          </div>
        )}

        <div className="btn-row">
          {cameraActive && (
            <button className="btn btn-primary" onClick={capturePhoto}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
              </svg>
              Capture &amp; Scan
            </button>
          )}
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Photo
            <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <button className="btn btn-secondary btn-small" onClick={onSkip} style={{ width: 'auto', display: 'inline-flex' }}>
          Skip — enter manually instead
        </button>
      </div>
    </>
  );
}
