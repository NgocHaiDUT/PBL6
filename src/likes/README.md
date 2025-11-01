# Likes Module

This module handles the likes functionality for posts, products, and comments in the beauty shopping application.

## Features

- **Create Like**: Users can like posts, products, or comments
- **Toggle Like**: Toggle like/unlike functionality
- **Get Like Stats**: Get total likes count and user's like status
- **Query Likes**: Get paginated list of likes with filtering options
- **Auto Update Counts**: Automatically updates post like counts

## API Endpoints

### POST /likes
Create a new like for a target (post/product/comment)

**Body:**
```json
{
  "target_type": "post",
  "target_id": 1
}
```

### GET /likes
Get paginated list of likes with optional filtering

**Query Parameters:**
- `target_type` (optional): Filter by target type (post/product/comment)
- `target_id` (optional): Filter by target ID
- `user_id` (optional): Filter by user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### POST /likes/toggle/:targetType/:targetId
Toggle like/unlike for a specific target

**Response:**
```json
{
  "liked": true,
  "total_likes": 42
}
```

### GET /likes/stats/:targetType/:targetId
Get like statistics for a target

**Response:**
```json
{
  "target_type": "post",
  "target_id": 1,
  "total_likes": 42,
  "user_liked": true
}
```

### GET /likes/:id
Get a specific like by ID

### DELETE /likes/:targetType/:targetId
Remove a like (unlike)

## Database Schema

The module uses the `likes` table with the following structure:
- `id`: Primary key
- `user_id`: Reference to users table
- `target_type`: Type of target (post/product/comment)
- `target_id`: ID of the target
- `created_at`: Timestamp when like was created

## Validation

- Target type must be one of: "post", "product", "comment"
- Target ID must be a valid integer
- Prevents duplicate likes (unique constraint on user_id, target_type, target_id)
- Verifies that the target exists before creating a like

## Auto-Updates

- For posts: Automatically updates the `like_count` field in the posts table
- Can be extended for products and comments as needed

## Error Handling

- `ConflictException`: When user tries to like something they already liked
- `NotFoundException`: When target doesn't exist or like not found
- Proper validation messages for invalid input data