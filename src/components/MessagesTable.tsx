import React, { useState } from 'react';
import { Search, Filter, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { SlackDM } from '../types/slack';

interface MessagesTableProps {
  dms: SlackDM[];
}

export const MessagesTable: React.FC<MessagesTableProps> = ({ dms }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'no-reply'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredDms = dms.filter(dm => {
    const matchesSearch = dm.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dm.recipient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesReply = replyFilter === 'all' || 
                        (replyFilter === 'replied' && dm.has_reply) ||
                        (replyFilter === 'no-reply' && !dm.has_reply);
    const matchesDate = !dateFilter || dm.date === dateFilter;
    
    return matchesSearch && matchesReply && matchesDate;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-gray-600">Track all your DMs and their reply status</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search messages or recipients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={replyFilter}
                onChange={(e) => setReplyFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Messages</option>
                <option value="replied">Replied</option>
                <option value="no-reply">No Reply</option>
              </select>
              
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDms.map((dm) => (
                <tr key={dm.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-medium text-sm">
                          {dm.recipient_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{dm.recipient_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{dm.message}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(dm.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(dm.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      dm.has_reply 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {dm.has_reply ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Replied
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          No Reply
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a
                      href={dm.slack_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-900 flex items-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDms.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};