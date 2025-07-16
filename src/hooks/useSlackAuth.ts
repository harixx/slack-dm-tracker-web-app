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
  const [oauthLoading, setOauthLoading] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      console.log('🔄 Initializing authentication...');
      setLoading(true);
      try {
        // Check for token in URL (from OAuth redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userParam = urlParams.get('user');
        const error = urlParams.get('error');

        console.log('URL parameters:', {
          token: token ? 'PRESENT' : 'MISSING',
          user: userParam ? 'PRESENT' : 'MISSING',
          error: error || 'NONE'
        });

        if (error) {
          console.error('❌ OAuth error from URL:', error);
          alert(`Authentication failed: ${error}`);
          setOauthLoading(false);
          setLoading(false);
          return;
        }

        if (token && userParam) {
          console.log('✅ Token and user data found in URL, processing...');
          try {
            const user = JSON.parse(decodeURIComponent(userParam));
            console.log('👤 Parsed user data:', {
              id: user.id,
              name: user.name,
              real_name: user.real_name
            });
            
            const newAuthState = {
              isAuthenticated: true,
              user: {
                id: user.id,
                name: user.name,
                real_name: user.real_name || user.name,
                profile: {
                  image_24: user.profile?.image_24 || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=24`,
                  image_32: user.profile?.image_32 || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=32`,
                  image_48: user.profile?.image_48 || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=48`,
                  image_72: user.profile?.image_72 || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&size=72`
                }
              },
              token
            };

            console.log('💾 Storing auth state...');
            setAuthState(newAuthState);
            localStorage.setItem('slack_auth', JSON.stringify(newAuthState));
            
            setOauthLoading(false);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('✅ Authentication successful!');
          } catch (error) {
            console.error('❌ Error parsing user data:', error);
            alert('Failed to parse authentication data');
            setOauthLoading(false);
          }
        } else {
          console.log('🔍 Checking localStorage for existing auth...');
          // Check localStorage for existing auth
          const savedAuth = localStorage.getItem('slack_auth');
          if (savedAuth) {
            console.log('📱 Found saved auth, verifying token...');
            try {
              const parsedAuth = JSON.parse(savedAuth);
              // Verify token is still valid
              const isValid = await verifyToken(parsedAuth.token);
              if (isValid) {
                console.log('✅ Stored token is valid, restoring session');
                setAuthState(parsedAuth);
              } else {
                console.log('❌ Stored token is invalid, clearing localStorage');
                localStorage.removeItem('slack_auth');
              }
            } catch (error) {
              console.error('❌ Error parsing stored auth:', error);
              localStorage.removeItem('slack_auth');
            }
          } else {
            console.log('📱 No saved auth found');
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        console.log('🏁 Auth initialization complete');
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const verifyToken = async (token: string): Promise<boolean> => {
    console.log('🔍 Verifying token with server...');
    try {
      const response = await fetch(`${API_BASE}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const isValid = response.ok;
      console.log(`🎫 Token verification result: ${isValid ? 'VALID' : 'INVALID'}`);
      return isValid;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return false;
    }
  };

  const login = () => {
    console.log('🚀 Initiating Slack OAuth flow...');
    setOauthLoading(true);
    window.location.href = `${API_BASE}/slack/install`;
  };

  const logout = () => {
    console.log('👋 Logging out user...');
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null
    });
    localStorage.removeItem('slack_auth');
    console.log('✅ User logged out successfully');
  };

  return {
    authState,
    login,
    logout,
    loading: oauthLoading || loading
  };
};