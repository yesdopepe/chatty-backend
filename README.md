# Chat Application Backend

A real-time chat application backend built with NestJS, PostgreSQL, TypeORM, and WebSocket.

## Features

### 1. Authentication System

- User registration with email validation
- Secure password hashing using bcrypt
- JWT-based authentication
- User status tracking (online/offline)
- Protected routes using Guards

### 2. Friend Management System

The friend management system provides comprehensive functionality for managing user relationships, including friend requests, blocking, and friend suggestions.

#### Friend Request Endpoints

```http
# Send Friend Request
POST /friendships/request
Authorization: Bearer <jwt_token>
{
  "friendId": "number"
}

# Accept Friend Request
POST /friendships/accept/:friendId
Authorization: Bearer <jwt_token>

# Search Friends
GET /friendships/search?search=<query>&page=<number>&limit=<number>
Authorization: Bearer <jwt_token>

# Block User
POST /friendships/block/:friendId
Authorization: Bearer <jwt_token>

# Unblock User
DELETE /friendships/unblock/:friendId
Authorization: Bearer <jwt_token>

# Get Friend Suggestions
GET /friendships/suggestions?limit=<number>
Authorization: Bearer <jwt_token>

# Search Users (for adding friends)
GET /users/search?search=<query>&page=<number>&limit=<number>
Authorization: Bearer <jwt_token>
```

#### Friend Request Flow

1. **Sending Friend Request:**

   - Validates target user exists
   - Checks for existing friendship/block
   - Creates pending friendship record
   - Response includes friendship status

2. **Accepting Friend Request:**

   - Validates request exists
   - Updates status to 'accepted'
   - Returns updated friendship status

3. **Blocking Users:**

   - Creates or updates friendship to blocked status
   - Prevents blocked users from sending requests
   - Optionally removes existing friendship

4. **Friend Search:**

   - Pagination support
   - Search by username
   - Returns only accepted friendships
   - Includes user details

5. **Friend Suggestions:**
   - Based on mutual connections
   - Excludes existing friends and blocked users
   - Customizable limit
   - Returns relevant user details

#### Response Examples

1. **Friend Request Response:**
   json
   {
   "user_id": 1,
   "friend_id": 2,
   "status": "pending",
   "requested_at": "2024-01-07T12:00:00Z"
   }

````

2. **Friend Search Response:**
```json
{
  "data": [
    {
      "user_id": 2,
      "username": "jane_doe",
      "email": "jane@example.com",
      "profile_picture": "url",
      "status": "online"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
````

3. **Friend Suggestions Response:**

```json
[
  {
    "user_id": 3,
    "username": "john_smith",
    "email": "john@example.com",
    "profile_picture": "url",
    "status": "offline"
  }
]
```

#### Error Handling

The system handles various error cases:

- `400 Bad Request`: Invalid input or duplicate request
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Blocked user or insufficient permissions
- `404 Not Found`: User or friendship not found

### Database Schema

#### Friendship Entity

```typescript
@Entity('friendships')
export class Friendship {
  @PrimaryColumn()
  user_id: number;

  @PrimaryColumn()
  friend_id: number;

  @Column({ type: 'varchar', length: 20 })
  status: 'pending' | 'accepted' | 'blocked';

  @CreateDateColumn()
  requested_at: Date;
}
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_NAME=your_database
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=1d
   ```
4. Start PostgreSQL database
5. Run migrations:
   ```bash
   npm run migration:run
   ```
6. Start the server:
   ```bash
   npm run start:dev
   ```

## Testing

Run the test suite:

```bash
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

```

```
