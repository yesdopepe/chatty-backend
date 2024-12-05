# Chat Application Backend

A real-time chat application backend built with NestJS, PostgreSQL, TypeORM, and WebSocket.

## Authentication System Documentation

The authentication system provides secure user registration, login, and logout functionality using JWT (JSON Web Tokens).

### Features

- User registration with email validation
- Secure password hashing using bcrypt
- JWT-based authentication
- User status tracking (online/offline)
- Protected routes using Guards
- Comprehensive error handling

### API Endpoints

#### 1. Register User

```http
POST /auth/register
```

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response (201):**

```json
{
  "access_token": "string",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**

- `409` - Username or email already exists
- `400` - Invalid input data

#### 2. Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**

```json
{
  "access_token": "string",
  "user": {
    "user_id": "number",
    "username": "string",
    "email": "string"
  }
}
```

**Error Responses:**

- `401` - Invalid credentials

#### 3. Logout

```http
POST /auth/logout
```

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response (200):**

```json
{
  "message": "Successfully logged out"
}
```

**Error Responses:**

- `401` - Unauthorized
- `404` - User not found

### Authentication Flow

1. **Registration:**

   - Validate input data
   - Check for existing username/email
   - Hash password
   - Create user
   - Generate JWT
   - Return token and user data

2. **Login:**

   - Validate credentials
   - Update user status to 'online'
   - Generate JWT
   - Return token and user data

3. **Logout:**
   - Verify JWT token
   - Update user status to 'offline'
   - Return success message

### Security Features

1. **Password Security:**

   - Passwords are hashed using bcrypt
   - Original passwords are never stored
   - Password hash is excluded from responses

2. **JWT Implementation:**

   - Tokens include user ID and username
   - Configurable expiration time
   - Protected routes using JwtAuthGuard

3. **Data Validation:**
   - Input validation using class-validator
   - Email format validation
   - Minimum password length requirement
   - Username uniqueness check

### Database Schema (User Entity)

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  user_id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ nullable: true })
  profile_picture: string;

  @Column({ default: 'offline' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
```

### Environment Configuration

Required environment variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=your_database

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d

# Environment
NODE_ENV=development
```

### Testing

The authentication system includes comprehensive e2e tests covering:

1. Registration:

   - Successful registration
   - Duplicate username handling
   - Invalid email validation

2. Login:

   - Successful login
   - Invalid credentials handling
   - Non-existent user handling

3. Logout:
   - Successful logout
   - Unauthorized access handling
   - Invalid token handling

Run tests using:

```bash
npm run test:e2e
```

### Error Handling

The system implements the following error types:

- `UnauthorizedException` - Invalid credentials or token
- `ConflictException` - Duplicate username/email
- `NotFoundException` - User not found
- `BadRequestException` - Invalid input data

### Future Enhancements

Potential improvements to consider:

1. Refresh token implementation
2. Password reset functionality
3. Email verification
4. OAuth integration
5. Rate limiting
6. Session management

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`
4. Start PostgreSQL database
5. Run migrations:
   ```bash
   npm run typeorm:run-migrations
   ```
6. Start the application:
   ```bash
   npm run start:dev
   ```

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.
