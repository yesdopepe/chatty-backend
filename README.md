# Chatty Backend

A real-time chat application backend built with NestJS, TypeORM, PostgreSQL, and WebSockets.

![Database Schema](MainLayout.svg)

## Features

- 👥 User Authentication & Management
- 💬 Real-time Messaging
- 👫 Friendship System
- 🔔 Real-time Notifications
- 🟢 Online/Offline Status
- ✍️ Typing Indicators
- 📱 Multi-device Support
- ✅ Read Receipts

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **WebSockets**: Socket.IO
- **Authentication**: JWT
- **API Documentation**: Swagger (coming soon)

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run typeorm migration:run

# Start the development server
npm run start:dev
```

## API Documentation

### Authentication Endpoints

#### POST /auth/register

Create a new user account.

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

Response: JWT token and user information

#### POST /auth/login

Login with existing credentials.

```json
{
  "username": "string",
  "password": "string"
}
```

Response: JWT token and user information

#### POST /auth/logout

Logout the current user.

- Requires Authentication Header: `Authorization: Bearer <token>`
- Updates user status to offline

### Notification System

The notification system uses WebSockets to deliver real-time notifications to connected clients. It supports different types of notifications and maintains a persistent connection for instant delivery.

#### Notification Types

- `message`: New message notifications
- `friend_request`: Friend request notifications
- `group_invite`: Group chat invitation notifications
- `system`: System notifications

#### REST Endpoints

##### GET /notifications

Get all notifications for the current user.

- Requires Authentication
- Returns notifications sorted by creation date (newest first)
- Excludes deleted notifications

##### GET /notifications/unread

Get unread notifications for the current user.

- Requires Authentication
- Returns only unread notifications
- Sorted by creation date (newest first)

##### POST /notifications/:id/read

Mark a notification as read.

- Requires Authentication
- Parameters:
  - `id`: Notification ID
- Returns the updated notification

##### POST /notifications/read-all

Mark all notifications as read for the current user.

- Requires Authentication
- Updates all unread notifications to read status

##### DELETE /notifications/:id

Soft delete a notification.

- Requires Authentication
- Parameters:
  - `id`: Notification ID
- Notification remains in database but is marked as deleted

#### WebSocket Events

##### Connection

Connect to the notification WebSocket:

```javascript
const socket = io('http://your-server:3000/notifications', {
  auth: {
    token: 'your-jwt-token', // JWT token required for authentication
  },
});
```

##### Events

###### Receiving Notifications

```javascript
socket.on('notification', (notification) => {
  // notification object contains:
  // {
  //   notification_id: string
  //   type: 'message' | 'friend_request' | 'group_invite' | 'system'
  //   content: string
  //   metadata: object
  //   is_read: boolean
  //   created_at: Date
  //   title: string
  // }
});
```

###### Connection Status

```javascript
socket.on('notifications:connected', (status) => {
  // status.status === 'connected'
});

socket.on('error', (error) => {
  // Handle connection errors
});
```

#### Notification Object Structure

```typescript
{
  notification_id: string;     // Unique identifier
  type: NotificationType;      // Type of notification
  content: string;            // Notification message
  metadata: {                 // Additional data based on type
    conversation_id?: string;
    sender_name?: string;
    message_preview?: string;
    sender_id?: string;
    group_name?: string;
  };
  is_read: boolean;           // Read status
  created_at: Date;           // Creation timestamp
  updated_at: Date;           // Last update timestamp
  deleted_at: Date | null;    // Soft delete timestamp
}
```

#### Mobile Implementation Example

1. **Connect to WebSocket**:

```javascript
class NotificationsService {
  connect(authToken) {
    this.socket = io('http://your-server:3000/notifications', {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('notification', this.handleNotification);
  }
}
```

2. **Handle Different Notification Types**:

```javascript
handleNotification(notification) {
  switch (notification.type) {
    case 'message':
      // Navigate to conversation
      navigation.navigate('Conversation', {
        conversationId: notification.metadata.conversation_id
      });
      break;
    case 'friend_request':
      // Show friend request screen
      navigation.navigate('FriendRequests');
      break;
    // ... handle other types
  }
}
```

3. **Manage Connection State**:

```javascript
useEffect(() => {
  // Connect when app becomes active
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      notificationsService.connect(authToken);
    }
  });

  return () => subscription.remove();
}, []);
```

### User Endpoints

#### GET /users

Get all users.

- Requires Authentication
- Returns list of users with basic information

#### GET /users/:id

Get user by ID.

- Requires Authentication
- Returns detailed user information

### Conversation Endpoints

#### POST /conversations

Create a new conversation.

```json
{
  "name": "string (optional)",
  "is_group": "boolean (optional)",
  "participant_ids": "string[]"
}
```

- Requires Authentication
- For non-group chats, exactly 2 participants required
- For group chats, name is required
- Returns the created conversation

#### GET /conversations

Get all conversations for the current user.

- Requires Authentication
- Returns list of conversations with latest messages
- Includes participant information

#### GET /conversations/:id

Get a specific conversation.

- Requires Authentication
- Returns conversation details with messages
- Must be a participant to access

#### POST /conversations/:id/participants

Add participants to a group conversation.

```json
{
  "userIds": "string[]"
}
```

- Requires Authentication
- Only works for group conversations
- Returns updated conversation

#### POST /conversations/:id/participants/:userId/remove

Remove a participant from a group conversation.

- Requires Authentication
- Only works for group conversations
- Cannot remove last participant
- Returns updated conversation

### Message Endpoints

#### POST /messages

Send a new message.

```json
{
  "content": "string",
  "conversation_id": "string"
}
```

- Requires Authentication
- Must be a conversation participant
- Returns created message
- Triggers real-time notification

#### GET /messages/conversation/:conversationId

Get all messages in a conversation.

- Requires Authentication
- Must be a conversation participant
- Returns messages in chronological order
- Excludes deleted messages

#### PUT /messages/:id

Edit a message.

```json
{
  "content": "string"
}
```

- Requires Authentication
- Only the sender can edit
- Marks message as edited
- Returns updated message

#### PUT /messages/:id/status

Update message status.

```json
{
  "status": "'delivered' | 'read'"
}
```

- Requires Authentication
- Must be a conversation participant
- Triggers real-time status update

#### DELETE /messages/:id

Delete a message (soft delete).

- Requires Authentication
- Only the sender can delete
- Message remains in database but marked as deleted

## WebSocket Events

### Connection

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    userId: 'current-user-id',
  },
});
```

### Message Events

#### Emit: 'sendMessage'

Send a new message:

```javascript
socket.emit('sendMessage', {
  content: 'Hello!',
  conversation_id: 'conversation-id',
});
```

#### Listen: 'newMessage'

Receive new messages:

```javascript
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});
```

### Typing Indicators

#### Emit: 'typing'

Send typing status:

```javascript
socket.emit('typing', {
  conversationId: 'conversation-id',
  isTyping: true,
});
```

#### Listen: 'userTyping'

Receive typing status:

```javascript
socket.on('userTyping', ({ userId, conversationId, isTyping }) => {
  console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'}`);
});
```

### User Status

#### Listen: 'userStatus'

Receive user status updates:

```javascript
socket.on('userStatus', ({ userId, status }) => {
  console.log(`User ${userId} is ${status}`);
});
```

### Message Status

#### Listen: 'messageStatus'

Receive message status updates:

```javascript
socket.on('messageStatus', ({ messageId, userId, status }) => {
  console.log(`Message ${messageId} is ${status}`);
});
```

### Conversation Room Management

#### Emit: 'joinConversation'

Join a conversation room:

```javascript
socket.emit('joinConversation', 'conversation-id');
```

#### Emit: 'leaveConversation'

Leave a conversation room:

```javascript
socket.emit('leaveConversation', 'conversation-id');
```

## Database Schema

The database schema includes the following tables:

### users

- user_id (UUID, PK)
- username (VARCHAR, unique)
- email (VARCHAR, unique)
- password_hash (VARCHAR)
- status (ENUM: 'online', 'offline')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### conversations

- conversation_id (UUID, PK)
- name (VARCHAR, nullable)
- is_group (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### conversation_participants

- conversation_id (UUID, FK)
- user_id (UUID, FK)
- PRIMARY KEY (conversation_id, user_id)

### messages

- message_id (UUID, PK)
- conversation_id (UUID, FK)
- sender_id (UUID, FK)
- content (TEXT)
- status (ENUM: 'sent', 'delivered', 'read')
- is_edited (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- deleted_at (TIMESTAMP, nullable)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```

```
