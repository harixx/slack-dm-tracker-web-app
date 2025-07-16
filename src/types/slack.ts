export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
  };
}

export interface SlackDM {
  id: string;
  user_id: string;
  recipient_id: string;
  recipient_name: string;
  message: string;
  timestamp: string;
  has_reply: boolean;
  reply_timestamp?: string;
  slack_link: string;
  date: string;
}

export interface DailyDigest {
  date: string;
  total_sent: number;
  total_replies: number;
  reply_rate: number;
  top_conversations: SlackDM[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: SlackUser | null;
  token: string | null;
}