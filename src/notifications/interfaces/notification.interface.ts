export interface NotificationResponse {
  id: number;
  user_id: number;
  type: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean;
  meta_json: string | null;
  created_at: Date;
}

export interface NotificationStatsResponse {
  total: number;
  unread: number;
  read: number;
}

export interface PaginatedNotificationsResponse {
  data: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateNotificationData {
  user_id: number;
  type?: string;
  title?: string;
  body?: string;
  meta_json?: object;
}