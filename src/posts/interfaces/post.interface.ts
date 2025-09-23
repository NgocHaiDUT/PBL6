export interface PostResponse {
  id: number;
  user_id: number;
  shop_id?: number;
  post_type: string;
  title?: string;
  content_md: string;
  cover_url?: string;
  video_url?: string;
  moderation_status: string;
  visibility: string;
  view_count: number;
  like_count: number;
  created_at: Date;
  updated_at: Date;
  user: {
    id: number;
    full_name: string;
    avatar_url: string;
  };
  shop?: {
    id: number;
    name: string;
    logo_url: string;
  };
  post_media: PostMedia[];
  post_products: PostProduct[];
  post_tags: PostTag[];
  likes_count: number;
  comments_count: number;
}

export interface PostMedia {
  id: number;
  post_id: number;
  media_url: string;
  media_type: string;
  sort_order: number;
  created_at: Date;
}

export interface PostProduct {
  post_id: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface PostTag {
  post_id: number;
  tag_id: number;
  tag: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface CommentResponse {
  id: number;
  user_id: number;
  target_type: string;
  target_id: number;
  content: string;
  parent_id?: number;
  created_at: Date;
  user: {
    id: number;
    full_name: string;
    avatar_url: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}