import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

export const EncryptionDemo: React.FC = () => {
  const [plaintext, setPlaintext] = useState('Sample secret payload');
  const [cipherPayload, setCipherPayload] = useState<any | null>(null);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const encrypt = async () => {
    try {
      setError(null);
      setDecrypted(null);
      const powToken = 'dev-ok';
      const resp = await axios.post(
        `${API_BASE_URL}/api/crypto/encrypt`,
        { plaintext, powToken },
        { withCredentials: true }
      );
      setCipherPayload(resp.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Encrypt failed');
    }
  };

  const decrypt = async () => {
    if (!cipherPayload) return;
    try {
      setError(null);
      const powToken = 'dev-ok';
      const resp = await axios.post(
        `${API_BASE_URL}/api/crypto/decrypt`,
        { ...cipherPayload, powToken },
        { withCredentials: true }
      );
      setDecrypted(resp.data.plaintext);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Decrypt failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxWidth: 620 }}>
      <textarea
        className="textarea"
        value={plaintext}
        onChange={(e) => setPlaintext(e.target.value)}
        rows={3}
      />

      <div className="button-row">
        <button className="button-primary" onClick={encrypt}>
          Encrypt (AES‑256‑GCM)
        </button>
        <button className="button-secondary" onClick={decrypt} disabled={!cipherPayload}>
          Decrypt
        </button>
      </div>

      {error && <div className="status-text status-text--error">{error}</div>}

      {cipherPayload && (
        <div className="payload-panel">
          <pre style={{ margin: 0 }}>{JSON.stringify(cipherPayload, null, 2)}</pre>
        </div>
      )}

      {decrypted && (
        <div className="decrypt-result">
          <span>Decrypted:</span>
          <span>{decrypted}</span>
        </div>
      )}
    </div>
  );
};

