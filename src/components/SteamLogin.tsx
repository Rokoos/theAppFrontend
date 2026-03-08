import React, { useEffect, useState } from 'react';
import { API_BASE_URL, apiClient } from '../api';

export const SteamLogin: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = async () => {
    try {
      setError(null);
      const resp = await apiClient.get('/api/auth/me');
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
          <a
            className="button-primary"
            href={`${API_BASE_URL}/api/auth/steam/start`}
            target="_self"
            rel="noopener noreferrer"
          >
            Login with Steam
          </a>
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

