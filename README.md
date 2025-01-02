# Link Chat Application - Backend Documentation

## Overview
Link Chat is a real-time chat application built with NestJS that provides secure, feature-rich communication capabilities. This backend service supports multiple chat features, user authentication, and real-time messaging.

## Features

### Authentication
- JWT-based authentication system
- Secure user registration and login
- Password encryption and protection
- Token-based session management

### User Management
- User profile creation and management
- User status tracking (online/offline)
- User search functionality
- Profile customization options

### Chat Channels
- Create and manage chat channels
- Public and private channel support
- Channel membership management
- Channel search functionality
- Real-time channel updates

### Messaging
- Real-time message delivery
- Message history storage
- Support for text messages
- Message status tracking
- Message deletion and editing capabilities

### Notifications
- Real-time notification system
- Channel invitation notifications
- Message notifications
- User activity notifications

## Technical Stack
- **Framework**: NestJS
- **Database**: PostgreSQL
- **Real-time Communication**: WebSockets
- **Authentication**: JWT (JSON Web Tokens)
- **API Style**: RESTful + WebSocket

## Frontend Implementation Guide

### 1. Setting Up Authentication

```typescript
// Example of authentication endpoints
POST /auth/register
Body: {
  username: string,
  email: string,
  password: string
}

POST /auth/login
Body: {
  email: string,
  password: string
}
```

### 2. WebSocket Connection

```typescript
// Connect to WebSocket
const socket = new WebSocket('ws://your-server:3000');

// Listen for messages
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle different message types
};
```

### 3. Channel Operations

```typescript
// Create a channel
POST /channel
Body: {
  name: string,
  isPrivate: boolean,
  members?: string[]
}

// Get channel messages
GET /channel/:channelId/messages

// Join a channel
POST /channel/:channelId/join
```

### 4. Message Operations

```typescript
// Send a message
POST /message
Body: {
  channelId: string,
  content: string,
  type: 'text'
}

// Delete a message
DELETE /message/:messageId

// Edit a message
PATCH /message/:messageId
Body: {
  content: string
}
```

### 5. User Operations

```typescript
// Get user profile
GET /user/:userId

// Update user profile
PATCH /user/profile
Body: {
  username?: string,
  avatar?: string,
  status?: string
}
```

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with:
   ```
   DATABASE_URL=your_database_url
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

4. Run the development server:
   ```bash
   npm run start:dev
   ```

## API Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## WebSocket Events

### Emitted Events
- `message.new`: New message in a channel
- `channel.update`: Channel updates
- `user.status`: User status changes
- `notification.new`: New notification

### Listening Events
- `message.send`: Send a new message
- `channel.join`: Join a channel
- `channel.leave`: Leave a channel
- `typing.start`: User started typing
- `typing.stop`: User stopped typing

## Error Handling

The API returns standard HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

Each error response includes:
```json
{
  "statusCode": number,
  "message": string,
  "error": string
}
```

## Best Practices for Frontend Implementation

1. **State Management**
   - Use a state management solution (Redux, MobX, etc.)
   - Keep WebSocket connection state
   - Cache messages and channels for better performance

2. **Real-time Updates**
   - Implement optimistic updates for better UX
   - Handle WebSocket reconnection
   - Queue messages when offline

3. **Error Handling**
   - Implement proper error boundaries
   - Show user-friendly error messages
   - Handle network issues gracefully

4. **Security**
   - Store JWT token securely
   - Implement token refresh mechanism
   - Sanitize user input

5. **Performance**
   - Implement message pagination
   - Cache frequently accessed data
   - Use debouncing for real-time events

## Support

For any questions or issues, please open an issue in the repository or contact the development team.
