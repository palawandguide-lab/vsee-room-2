import React, { useState } from 'react';

export default function PatientForm({ initialData, scanImage, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    firstName: initialData.firstName || '',
    lastName:  initialData.lastName || '',
    dob:       initialData.dob || '',
    gender:    initialData.gender || '',
    email:     '',
    phone:     '',
    address:   initialData.address || '',
    reason:    '',
  });

  const scannedFields = {};
  if (initialData.firstName) scannedFields.firstName = true;
  if (initialData.lastName) scannedFields.lastName = true;
  if (initialData.dob) scannedFields.dob = true;
  if (initialData.gender) scannedFields.gender = true;
  if (initialData.address) scannedFields.address = true;

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.reason) return;
    onSubmit(form);
  };

  const isValid = form.firstName && form.lastName && form.email && form.reason;

  return (
    <div className="card">
      <div className="card-title">Patient Information</div>
      <div className="card-subtitle">
        Review and complete your details. Fields marked with <span style={{ color: 'var(--danger)' }}>*</span> are required.
      </div>

      {scanImage && (
        <div className="scan-preview">
          <img src={scanImage} alt="Scanned ID" />
          <div className="scan-preview-info">
            <strong>ID Scanned Successfully</strong>
            <span>Fields auto-filled from your ID. Please verify accuracy.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <strong>Connection Error</strong>
          {error}
        </div>
      )}

      <div className="form-row">
        <div className="field">
          <label>First Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="text"
            placeholder="John"
            value={form.firstName}
            onChange={handleChange('firstName')}
            className={scannedFields.firstName ? 'scanned' : ''}
          />
        </div>
        <div className="field">
          <label>Last Name <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="text"
            placeholder="Smith"
            value={form.lastName}
            onChange={handleChange('lastName')}
            className={scannedFields.lastName ? 'scanned' : ''}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="field">
          <label>Date of Birth <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input
            type="date"
            value={form.dob}
            onChange={handleChange('dob')}
            className={scannedFields.dob ? 'scanned' : ''}
          />
        </div>
        <div className="field">
          <label>Gender</label>
          <select
            value={form.gender}
            onChange={handleChange('gender')}
            className={scannedFields.gender ? 'scanned' : ''}
          >
            <option value="">Select…</option>
            <option value="1">Male</option>
            <option value="2">Female</option>
            <option value="3">Non-binary</option>
            <option value="4">Prefer not to say</option>
          </select>
        </div>
      </div>

      <div className="form-row full">
        <div className="field">
          <label>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="email" placeholder="john.smith@email.com" value={form.email} onChange={handleChange('email')} />
        </div>
      </div>

      <div className="form-row full">
        <div className="field">
          <label>Phone</label>
          <input type="tel" placeholder="(555) 123-4567" value={form.phone} onChange={handleChange('phone')} />
        </div>
      </div>

      <div className="form-row full">
        <div className="field">
          <label>Address</label>
          <input
            type="text"
            placeholder="123 Main St, City, State ZIP"
            value={form.address}
            onChange={handleChange('address')}
            className={scannedFields.address ? 'scanned' : ''}
          />
        </div>
      </div>

      <div className="form-row full">
        <div className="field">
          <label>Reason for Visit <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea placeholder="Describe your symptoms or reason for today's visit…" value={form.reason} onChange={handleChange('reason')} />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSubmit} disabled={!isValid || loading}>
        {loading ? (
          <><span className="loader" /> Connecting to clinic…</>
        ) : (
          <>
            Continue to Waiting Room
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
