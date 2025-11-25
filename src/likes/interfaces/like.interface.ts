export interface LikeResponse {
  id: number;
  user_id: number;
  target_type: string;
  target_id: number;
  created_at: Date;
  user?: {
    id: number;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
}

export interface LikeStatsResponse {
  target_type: string;
  target_id: number;
  total_likes: number;
  user_liked: boolean;
}

export interface PaginatedLikesResponse {
  data: LikeResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
