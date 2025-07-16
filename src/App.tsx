import React, { useState } from 'react';
import { Login } from './components/Login';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MessagesTable } from './components/MessagesTable';
import { DailyDigest } from './components/DailyDigest';
import { useSlackAuth } from './hooks/useSlackAuth';
import { useSlackData } from './hooks/useSlackData';

function App() {
  const { authState, login, logout } = useSlackAuth();
  const { dms, loading, syncing, syncDMs, sendDigest, generateDailyDigest } = useSlackData(authState.token);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!authState.isAuthenticated) {
    return <Login onLogin={login} loading={loading} />;
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your DM data...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard dms={dms} onSync={syncDMs} syncing={syncing} />;
      case 'messages':
        return <MessagesTable dms={dms} />;
      case 'digest':
        return <DailyDigest dms={dms} generateDailyDigest={generateDailyDigest} onSendDigest={sendDigest} />;
      case 'users':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Users</h2>
            <p className="text-gray-600">Multi-user management (Coming soon)</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">Configure your DM tracking preferences</p>
          </div>
        );
      default:
        return <Dashboard dms={dms} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={authState.user!} onLogout={logout} />
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;