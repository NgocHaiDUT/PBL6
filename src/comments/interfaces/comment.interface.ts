export interface CommentResponse {
  id: number;
  user_id: number;
  target_type: string;
  target_id: number;
  content: string;
  parent_id: number | null;
  created_at: Date;
  user?: {
    id: number;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  replies?: CommentResponse[];
  replies_count?: number;
  likes_count?: number;
  is_liked?: boolean;
}

export interface CommentWithReplies extends CommentResponse {
  replies: CommentResponse[];
}

export interface PaginatedCommentsResponse {
  data: CommentResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
