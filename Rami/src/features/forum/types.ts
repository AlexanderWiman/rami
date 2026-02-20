export interface TextHighlight {
  start: number;
  end: number;
  color: string;
}

export interface ThreadContent {
  id: number;
  content_type: 'text' | 'image' | 'video' | 'file';
  content: string;
  sort_order: number;
  created_at?: string;
  created_by_username?: string;
  text_highlights?: TextHighlight[];
}

export interface Thread {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  category?: 'community' | 'sources';
  created_by_username: string;
  content_count?: number;
}

export interface ThreadWithContent {
  thread: Thread;
  content: ThreadContent[];
}

export interface Admin {
  id: number;
  username: string;
  role: 'superadmin' | 'admin';
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  admin: Admin;
}
