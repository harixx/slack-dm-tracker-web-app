import { useState, useEffect } from 'react';
import { SlackDM, DailyDigest } from '../types/slack';

const API_BASE = 'http://localhost:3001';

export const useSlackData = (token: string | null) => {
  const [dms, setDms] = useState<SlackDM[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDMs = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/dms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDms(data);
      }
    } catch (error) {
      console.error('Error fetching DMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncDMs = async () => {
    if (!token) return;

    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE}/api/sync-dms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDms(data.dms);
        return data;
      }
    } catch (error) {
      console.error('Error syncing DMs:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const sendDigest = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/send-digest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.digest;
      }
    } catch (error) {
      console.error('Error sending digest:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchDMs();
  }, [token]);

  const generateDailyDigest = (date: string): DailyDigest => {
    const dayDms = dms.filter(dm => dm.date === date);
    const totalSent = dayDms.length;
    const totalReplies = dayDms.filter(dm => dm.has_reply).length;
    const replyRate = totalSent > 0 ? (totalReplies / totalSent) * 100 : 0;

    return {
      date,
      total_sent: totalSent,
      total_replies: totalReplies,
      reply_rate: Math.round(replyRate),
      top_conversations: dayDms.slice(0, 3)
    };
  };

  return {
    dms,
    loading,
    syncing,
    syncDMs,
    sendDigest,
    generateDailyDigest,
    refetch: fetchDMs
  };
};