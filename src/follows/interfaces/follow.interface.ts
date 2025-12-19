export interface FollowResponse {
  follower_id: number;
  following_id: number;
  created_at: Date;
  follower?: {
    id: number;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  following?: {
    id: number;
    full_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  is_following?: boolean;
}

export interface FollowStatsResponse {
  user_id: number;
  followers_count: number;
  following_count: number;
  is_following?: boolean; // For current user perspective
}

export interface PaginatedFollowsResponse {
  data: FollowResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
