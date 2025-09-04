# LICEA Educational Platform - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid access token.

### Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "role": "student",
  "privacyConsent": true,
  "termsAccepted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email to verify your account.",
  "data": {
    "userId": 1,
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "student"
  }
}
```

### POST /auth/login
Authenticate user and get access tokens.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "student"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### GET /auth/me
Get current user information.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "role": "student",
    "email_verified": true,
    "registration_date": "2024-01-15T10:30:00Z",
    "last_login": "2024-01-20T14:22:00Z"
  }
}
```

## User Management

### GET /users
Get all users (Admin only).

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (admin, instructor, student)
- `search` (optional): Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "student",
      "email_verified": true,
      "is_active": true,
      "registration_date": "2024-01-15T10:30:00Z",
      "last_login": "2024-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

## Course Management

### GET /courses
Get all courses.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `instructor_id` (optional): Filter by instructor
- `is_active` (optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Introduction to Computer Science",
      "description": "Fundamental concepts of computer science...",
      "code": "CS101",
      "instructor_id": 2,
      "instructor_name": "Dr. Sarah Johnson",
      "start_date": "2024-01-15",
      "end_date": "2024-05-15",
      "is_active": true,
      "max_students": 30,
      "enrolled_students": 25,
      "created_at": "2024-01-10T09:00:00Z"
    }
  ]
}
```

### POST /courses
Create a new course (Instructor/Admin only).

**Request Body:**
```json
{
  "name": "Introduction to Web Development",
  "description": "Learn modern web development technologies",
  "code": "WEB101",
  "start_date": "2024-02-01",
  "end_date": "2024-06-01",
  "max_students": 25
}
```

### POST /courses/:id/enroll
Enroll in a course (Student only).

## Chat/AI Assistant

### GET /chat/conversations
Get user's chat conversations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Assignment Help - CS101",
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z"
    }
  ]
}
```

### POST /chat/quick-help
Get quick help from AI assistant without creating a conversation.

**Request Body:**
```json
{
  "message": "What are my upcoming assignments?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "What are my upcoming assignments?",
    "answer": "Based on your enrolled courses, here are your upcoming deadlines:\n\n• CS101 - Variables and Data Types: Due Feb 28, 2024 at 11:59 PM\n• WEB101 - Personal Website: Due March 1, 2024 at 11:59 PM",
    "timestamp": "2024-01-20T15:45:00Z"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

- `TOKEN_REQUIRED`: Authentication token missing
- `TOKEN_EXPIRED`: Access token has expired
- `INVALID_TOKEN`: Token is malformed or invalid
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request validation failed
- `USER_NOT_FOUND`: User does not exist
- `EMAIL_EXISTS`: Email already registered
- `COURSE_NOT_FOUND`: Course does not exist
- `ALREADY_ENROLLED`: Student already enrolled in course

## Rate Limiting

The API implements rate limiting:
- General endpoints: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP
- Password reset: 3 requests per hour per IP

When rate limit is exceeded:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Interactive API Documentation

When the backend server is running, you can access the interactive Swagger documentation at:
```
http://localhost:3001/api-docs
```

This provides a complete, interactive interface to test all API endpoints.
