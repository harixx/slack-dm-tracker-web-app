import React from 'react';
import { LogOut, Bell, Settings } from 'lucide-react';
import { SlackUser } from '../types/slack';

interface HeaderProps {
  user: SlackUser;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 font-bold text-lg">S</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Slack DM Tracker</h1>
            <p className="text-sm text-gray-600">Track and analyze your DM conversations</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <img
              src={user.profile.image_48}
              alt={user.real_name}
              className="w-8 h-8 rounded-full"
            />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user.real_name}</p>
              <p className="text-gray-500">@{user.name}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};