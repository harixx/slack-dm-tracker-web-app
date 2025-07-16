import React from 'react';
import { MessageSquare, Users, TrendingUp, Clock } from 'lucide-react';
import { SlackDM } from '../types/slack';

interface DashboardProps {
  dms: SlackDM[];
  onSync: () => Promise<any>;
  syncing: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ dms, onSync, syncing }) => {
  const handleSync = async () => {
    try {
      await onSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const totalSent = dms.length;
  const totalReplies = dms.filter(dm => dm.has_reply).length;
  const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;
  const uniqueRecipients = new Set(dms.map(dm => dm.recipient_id)).size;

  const today = new Date().toISOString().split('T')[0];
  const todayDms = dms.filter(dm => dm.date === today);

  const stats = [
    {
      title: 'Total DMs Sent',
      value: totalSent,
      icon: MessageSquare,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Reply Rate',
      value: `${replyRate}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: '+5%'
    },
    {
      title: 'Unique Recipients',
      value: uniqueRecipients,
      icon: Users,
      color: 'bg-purple-500',
      change: '+3%'
    },
    {
      title: 'Today\'s DMs',
      value: todayDms.length,
      icon: Clock,
      color: 'bg-orange-500',
      change: '+8%'
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
        <p className="text-gray-600">Overview of your DM activity and engagement</p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sync DMs</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-2">from last week</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {dms.slice(0, 5).map((dm) => (
              <div key={dm.id} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${dm.has_reply ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{dm.recipient_name}</p>
                  <p className="text-xs text-gray-500 truncate">{dm.message}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(dm.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Recipients</h3>
          <div className="space-y-4">
            {Object.entries(
              dms.reduce((acc, dm) => {
                acc[dm.recipient_name] = (acc[dm.recipient_name] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            )
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium text-sm">
                        {name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{count} messages</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};