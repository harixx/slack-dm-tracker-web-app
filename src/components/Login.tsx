import React from 'react';
import { MessageCircle, Users, BarChart3, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
  loading?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, loading = false }) => {
  const handleLogin = () => {
    console.log('Starting Slack OAuth flow...');
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-purple-100">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Slack DM Tracker</h1>
            <p className="text-gray-600">Track your DMs and boost your reply rates</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-gray-700">Multi-user authentication</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-700">Real-time reply tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-gray-700">Secure token management</span>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 0 2.5 2.5c1.61 0 2.527-1.88 2.527-2.5 0-.61-.915-2.5-2.527-2.5a2.528 2.528 0 0 0-2.5 2.5zm6.867-3.5c0 .61-.915 2.5-2.527 2.5a2.528 2.528 0 0 1-2.5-2.5 2.528 2.528 0 0 1 2.5-2.5c1.612 0 2.527 1.89 2.527 2.5zm7.5 3.5a2.528 2.528 0 0 1-2.5 2.5c-1.61 0-2.527-1.88-2.527-2.5 0-.61.915-2.5 2.527-2.5a2.528 2.528 0 0 1 2.5 2.5zm-6.867-3.5c0 .61.915 2.5 2.527 2.5a2.528 2.528 0 0 0 2.5-2.5 2.528 2.528 0 0 0-2.5-2.5c-1.612 0-2.527 1.89-2.527 2.5zM12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z"/>
                </svg>
                <span>Continue with Slack</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};