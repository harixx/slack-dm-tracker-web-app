import { useState, useEffect } from 'react';
import { SlackUser, AuthState } from '../types/slack';

const API_BASE = 'http://localhost:3001';

export const useSlackAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        const newAuthState = {
          isAuthenticated: true,
          user: {
            id: user.id,
            name: user.name,
            real_name: user.real_name || user.name,
            profile: {
              image_24: user.profile?.image_24 || `https://ui-avatars.com/api/?name=${user.name}&size=24`,
              image_32: user.profile?.image_32 || `https://ui-avatars.com/api/?name=${user.name}&size=32`,
              image_48: user.profile?.image_48 || `https://ui-avatars.com/api/?name=${user.name}&size=48`,
              image_72: user.profile?.image_72 || `https://ui-avatars.com/api/?name=${user.name}&size=72`
            }
          },
          token
        };

        setAuthState(newAuthState);
        localStorage.setItem('slack_auth', JSON.stringify(newAuthState));
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    } else {
      // Check localStorage for existing auth
      const savedAuth = localStorage.getItem('slack_auth');
      if (savedAuth) {
        try {
          const parsedAuth = JSON.parse(savedAuth);
          // Verify token is still valid
          verifyToken(parsedAuth.token).then(isValid => {
            if (isValid) {
              setAuthState(parsedAuth);
            } else {
              localStorage.removeItem('slack_auth');
            }
            setLoading(false);
          });
          return;
        } catch (error) {
          localStorage.removeItem('slack_auth');
        }
      }
    }
    setLoading(false);
  }, []);

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const login = () => {
    window.location.href = `${API_BASE}/slack/install`;
  };

  const logout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    localStorage.removeItem('slack_auth');
  };

  return {
    authState,
    login,
    logout,
    loading
  };
};