import React, { useState } from 'react';
import { Calendar, Send, TrendingUp, MessageSquare } from 'lucide-react';
import { SlackDM } from '../types/slack';

interface DailyDigestProps {
  dms: SlackDM[];
  generateDailyDigest: (date: string) => any;
  onSendDigest: () => Promise<any>;
}

export const DailyDigest: React.FC<DailyDigestProps> = ({ dms, generateDailyDigest, onSendDigest }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sending, setSending] = useState(false);
  
  const digest = generateDailyDigest(selectedDate);

  const sendDigest = async () => {
    setSending(true);
    try {
      await onSendDigest();
      alert('Daily digest sent to your Slack DM!');
    } catch (error) {
      alert('Failed to send digest. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Digest</h2>
        <p className="text-gray-600">Review your daily DM activity and send digest to Slack</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={sendDigest}
            disabled={sending}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
            <Send className="w-4 h-4" />
            <span>Send to Slack</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Messages Sent</p>
                <p className="text-2xl font-bold text-blue-900">{digest.total_sent}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Replies Received</p>
                <p className="text-2xl font-bold text-green-900">{digest.total_replies}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Reply Rate</p>
                <p className="text-2xl font-bold text-purple-900">{digest.reply_rate}%</p>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Conversations</h3>
          {digest.top_conversations.length > 0 ? (
            <div className="space-y-4">
              {digest.top_conversations.map((dm: SlackDM) => (
                <div key={dm.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium text-sm">
                        {dm.recipient_name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{dm.recipient_name}</p>
                      <p className="text-sm text-gray-600 truncate max-w-md">{dm.message}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      dm.has_reply 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dm.has_reply ? '✅ Replied' : '❌ No Reply'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(dm.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages found for this date.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};