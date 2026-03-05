import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

export const SteamLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const powToken = 'dev-ok';
      const resp = await axios.get(`${API_BASE_URL}/api/auth/steam/start`, {
        withCredentials: true,
        headers: {
          'X-POW-Token': powToken
        }
      });
      const { redirectUrl } = resp.data;
      window.location.href = `${API_BASE_URL}${redirectUrl}`;
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to start Steam login');
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      setError(null);
      const resp = await axios.get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true });
      setUser(resp.data.user);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Not authenticated');
      setUser(null);
    }
  };

  useEffect(() => {
    void fetchMe();
  }, []);

  return (
    <div className="card-body">
      <div className="button-row">
        {!user && (
          <button className="button-primary" onClick={startLogin} disabled={loading}>
            {loading ? 'Redirecting to Steam…' : 'Login with Steam'}
          </button>
        )}
        <button className="button-secondary" onClick={fetchMe}>
          Refresh session
        </button>
        {user && (
          <span className="status-chip">
            <span className="status-indicator" />
            Session active
          </span>
        )}
      </div>

      {error && <div className="status-text status-text--error">{error}</div>}
      {user && (
        <div className="avatar-row">
          <img src={user.avatar} alt="avatar" className="avatar-img" />
          <div className="avatar-meta">
            <div className="avatar-name">{user.personaname}</div>
            <div className="avatar-id">SteamID: {user.steamid}</div>
          </div>
        </div>
      )}
    </div>
  );
};

