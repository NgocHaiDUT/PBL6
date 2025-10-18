# Comments Module

This module handles the comments functionality for the beauty shopping app, supporting nested comments (replies) for posts and products.

## Features

- **Create Comments**: Add comments to posts or products
- **Nested Replies**: Support for replies to comments (parent-child relationship)
- **User Permissions**: Users can only update/delete their own comments
- **Pagination**: Efficient pagination for comment lists
- **User Information**: Includes user details (name, email, avatar) with each comment

## Database Schema

The comments are stored in the `comments` table with the following structure:

```sql
comments {
  id          Int      @id @default(autoincrement())
  user_id     Int
  target_type String   -- 'post' or 'product'
  target_id   Int      -- ID of the post or product
  content     String
  parent_id   Int?     -- For nested replies (null for top-level comments)
  created_at  DateTime @default(now())
  user        users    @relation(fields: [user_id], references: [id])
}
```

## API Endpoints

### Create Comment
- **POST** `/comments`
- **Body**: `CreateCommentDto`
- **Auth**: Required (user_id extracted from JWT)

### Get Comments
- **GET** `/comments?target_type=post&target_id=1&page=1&limit=20`
- **Query Parameters**: `QueryCommentsDto`
- **Returns**: Paginated list of comments with replies count

### Get Comment Details
- **GET** `/comments/:id`
- **Returns**: Comment details with all replies

### Get Comment Replies
- **GET** `/comments/:id/replies`
- **Returns**: Direct replies to a specific comment

### Update Comment
- **PATCH** `/comments/:id`
- **Body**: `UpdateCommentDto`
- **Auth**: Required (only comment author can update)

### Delete Comment
- **DELETE** `/comments/:id`
- **Auth**: Required (only comment author can delete)
- **Note**: Deletes all replies as well

## DTOs

### CreateCommentDto
```typescript
{
  target_type: string;    // 'post' or 'product'
  target_id: number;      // ID of the target
  content: string;        // Comment content (max 2000 chars)
  parent_id?: number;     // Optional parent comment ID for replies
}
```

### UpdateCommentDto
```typescript
{
  content?: string;       // Updated content (max 2000 chars)
}
```

### QueryCommentsDto
```typescript
{
  target_type: string;    // 'post' or 'product'
  target_id: number;      // ID of the target
  parent_id?: number;     // Filter by parent (null for top-level)
  page?: number;          // Page number (default: 1)
  limit?: number;         // Items per page (default: 20)
}
```

## Response Format

### CommentResponse
```typescript
{
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
}
```

### PaginatedCommentsResponse
```typescript
{
  data: CommentResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
```

## Usage Examples

### Create a top-level comment
```typescript
POST /comments
{
  "target_type": "post",
  "target_id": 1,
  "content": "Great post! Thanks for sharing."
}
```

### Reply to a comment
```typescript
POST /comments
{
  "target_type": "post",
  "target_id": 1,
  "content": "I agree with your comment!",
  "parent_id": 5
}
```

### Get comments for a post
```typescript
GET /comments?target_type=post&target_id=1&page=1&limit=10
```

### Get all replies to a comment
```typescript
GET /comments/5/replies
```

## Validation Rules

- **target_type**: Must be either 'post' or 'product'
- **target_id**: Must be a valid integer and exist in the corresponding table
- **content**: Required, max 2000 characters
- **parent_id**: If provided, must be a valid comment ID belonging to the same target
- **Page and limit**: Must be positive integers

## Security Features

- **Authorization**: Users can only update/delete their own comments
- **Validation**: All inputs are validated using class-validator
- **Error Handling**: Proper HTTP status codes and error messages
- **Cascade Delete**: When a comment is deleted, all its replies are also deleted

## Testing

The module includes comprehensive unit tests for both the controller and service:
- `comments.controller.spec.ts`
- `comments.service.spec.ts`

Run tests with:
```bash
npm run test
```