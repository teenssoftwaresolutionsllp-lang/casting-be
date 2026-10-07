# Talent Casting Expo Backend

This repository contains the NestJS API backend for the Talent Casting platform. It handles authentication, profile management, media uploads, stories, auditions, applications, chat, notifications, admin operations, and audit logging.

The project is structured as a modular backend service using NestJS, Drizzle ORM, PostgreSQL, and Cloudinary.

A separate admin frontend app is maintained alongside this backend for the dashboard experience.

## Project Structure

- Backend API: this repository
- Admin web app: separate frontend project connected to this API
- Database: PostgreSQL via Drizzle ORM
- Media storage: Cloudinary
- Email delivery: Resend

## Prerequisites

- Node.js 22.x
- PostgreSQL database
- Cloudinary account
- Resend API key for password reset emails
- Firebase project credentials for Google login

## Environment Variables

Create a `.env` file in the root directory using the values from `.env.example`.

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=supersecretjwtkeyforcastingapp2026
DATABASE_URL=postgresql://user:password@host:5432/db_name

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FIREBASE_PROJECT_ID=casting-29490
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@casting-29490.iam.gserviceaccount.com
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL="Casting <no-reply@your-verified-domain.com>"
BACKEND_URL=https://casting-be.vercel.app
FRONTEND_URL=http://localhost:5173
APP_DEEP_LINK_SCHEME=casting

PASSWORD_RESET_DEV_MODE=true
```

Notes:
- `BACKEND_URL` is used for mobile reset-link routing.
- `APP_DEEP_LINK_SCHEME` defines the app deep link, for example `casting://reset-password?...`.
- `FRONTEND_URL` is still useful for web-based redirects, but mobile apps should not rely on it directly.

## Installation

```bash
npm install
```

## Database Setup

```bash
npm run generate
npm run migrate
npm run seed:admin
npm run seed
```

What each command does:
- `generate` creates Drizzle migration files from the schema
- `migrate` applies schema changes to PostgreSQL
- `seed:admin` creates the default admin account
- `seed` loads demo content and sample user data

Default admin account:

```text
Email: admin@castingexpo.com
Password: Admin@123
```

## Running the Backend

```bash
npm run start
npm run start:dev
npm run start:prod
```

Swagger docs are available at:

```text
http://localhost:3000/api/docs
```

Production docs are served from the deployed backend URL too.

## API Documentation

Swagger UI is enabled in the app and exposes the routes for all modules.

Use it to:
- inspect endpoints
- test APIs directly
- view request/response payloads
- authorize with JWTs for protected routes

## Authentication APIs

### Register

Endpoint: `POST /auth/register`

Example:

```json
{
  "username": "jane_doe",
  "email": "jane@example.com",
  "password": "Password123!",
  "role": "artist",
  "mobile": "+919876543210",
  "age": 28,
  "gender": "Female",
  "fullName": "Jane Doe"
}
```

Response includes:
- JWT token
- user object
- generated TRK code

### Login

Endpoint: `POST /auth/login`

Supports login by:
- email
- mobile number
- TRK code

Example payload:

```json
{
  "identifier": "TRK260001",
  "password": "Password123!"
}
```

### Google Login

Endpoint: `POST /auth/google`

Uses Firebase ID token verification and creates a user if needed.

### Forgot Password

Endpoint: `POST /auth/forgot-password`

Example:

```json
{
  "email": "jane@example.com"
}
```

Behavior:
- checks the user by email
- stores a hashed, time-limited password reset token
- sends a reset email via Resend
- in local development mode, returns a `resetToken` if `PASSWORD_RESET_DEV_MODE=true`

### Reset Password Flow for Mobile Apps

The backend now supports a mobile-friendly reset flow.

Email link format:

```text
https://casting-be.vercel.app/auth/reset-link?token=abc123
```

This route redirects to the app deep link:

```text
casting://reset-password?token=abc123
```

The actual API used by the app remains:

```text
POST /auth/reset-password
```

Payload:

```json
{
  "token": "token-from-email-link",
  "password": "NewPassword123!"
}
```

The reset token is hashed before storage and expires after 30 minutes.

### Reset Password Endpoint

Endpoint: `POST /auth/reset-password`

Validates:
- token presence
- token validity
- token expiry
- password hashing

On success:

```json
{
  "message": "Password successfully reset."
}
```

## Profile Completion and Artist Setup

Artist accounts are allowed to complete their profile later.

There are dedicated profile endpoints for this:

- `GET /profile/me`
- `PATCH /profile/me`
- `GET /profile/me/completion`

This allows a user to register first and finish profile details later without blocking onboarding.

## Admin APIs

Admin authentication is separate from regular user authentication and uses a dedicated admin table.

Default admin login:

```text
Email: admin@castingexpo.com
Password: Admin@123
```

### Admin Login

Endpoint: `POST /admin/login`

Example:

```json
{
  "email": "admin@castingexpo.com",
  "password": "Admin@123"
}
```

Response:

```json
{
  "token": "jwt-token",
  "admin": {
    "id": "uuid",
    "email": "admin@castingexpo.com",
    "fullName": "Super Admin",
    "role": "super_admin"
  }
}
```

### Admin Protected Routes

All admin routes require the admin JWT in the Authorization header.

#### Dashboard

- `GET /admin/dashboard`

Returns counts like:
- total users
- total artists
- total audiences
- total videos
- total auditions
- total applications
- new users by day/week/month

#### User Management

- `GET /admin/users`
- `GET /admin/users/:id`
- `GET /admin/users/:id/videos`
- `GET /admin/users/:id/auditions`
- `GET /admin/users/:id/applications`
- `GET /admin/users/:id/stories`
- `GET /admin/users/:id/followers`
- `GET /admin/users/:id/following`

Supports pagination, search, and role filtering.

#### Activity Logs

- `GET /admin/users/:id/activity`
- `GET /admin/activity-logs`

Filters available:
- `page`
- `limit`
- `action`
- `userId`
- `startDate`
- `endDate`

## Activity Audit Logging

The app records user actions in the activity logs table permanently.

Tracked action examples:
- `REGISTER`
- `LOGIN`
- `PROFILE_UPDATE`
- `VIDEO_UPLOAD`
- `AUDITION_CREATE`
- `APPLICATION_SUBMIT`
- `FOLLOW`
- `UNFOLLOW`
- `STORY_CREATE`
- `COMMENT`
- `LIKE`
- `REPORT`
- `PASSWORD_CHANGE`
- `ADMIN_LOGIN`

## Media Uploads

The media module uploads files to Cloudinary with file-size limits.

Current upload limits:
- generic upload: 100 MB
- photo upload: 50 MB
- video upload: 500 MB

Video endpoint:

```text
POST /videos/upload
```

## Stories API

Stories remain active for 24 hours and allow image or video uploads.

Endpoints:

- `POST /stories`
- `GET /stories/feed`
- `POST /stories/:id/views`
- `DELETE /stories/:id`

## Core Database Tables

- `users`
- `follows`
- `videos`
- `video_likes`
- `comments`
- `comment_likes`
- `auditions`
- `applications`
- `stories`
- `story_views`
- `chats`
- `chat_participants`
- `messages`
- `notifications`
- `activity_logs`
- `admin_users`

## NPM Scripts

```bash
npm run start
npm run start:dev
npm run start:prod
npm run build
npm run test
npm run lint
npm run generate
npm run migrate
npm run seed
npm run seed:admin
```

## Deployment

This backend is designed to be deployed to Vercel as a serverless Node API.

Recommended production flow:
- backend API deployed separately
- admin frontend deployed separately
- backend env includes `BACKEND_URL` and `APP_DEEP_LINK_SCHEME`
- frontend env points to the backend URL

Example backend URL:

```text
https://casting-be.vercel.app
```

## Notes

- Admin and user authentication are completely separate.
- Artists can register and fill profile information later.
- Password reset uses a token redirect flow for mobile deep links.
- Swagger docs need static assets to be served correctly in production deployments.

## License

This project is private and intended for internal platform usage.



APP_DEEP_LINK_SCHEME=casting
BACKEND_URL=https://casting-be.vercel.app
CLOUDINARY_API_KEY=516387729162788
CLOUDINARY_API_SECRET=mkNOglXKr13ziWD4Yl65wJ3QLuA
CLOUDINARY_CLOUD_NAME=prmynfbv
DATABASE_URL="postgresql://neondb_owner:npg_y1nfKVeqcx4M@ep-empty-wave-a5rmrick-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
ENABLE_TEST_MODE=false
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@casting-29490.iam.gserviceaccount.com
FIREBASE_PROJECT_ID=casting-29490
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FRONTEND_URL=http://localhost:5173
JWT_SECRET=supersecretjwtkeyforcastingapp2026
NODE_ENV=production
PASSWORD_RESET_DEV_MODE=false
PORT=3000
RAZORPAY_KEY_ID=rzp_test_SRrKIfsKje5uNq
RAZORPAY_KEY_SECRET=KfntU4VVvNMAX64AvdhClFNd

RESEND_FROM_EMAIL="Casting <no-reply@treemediaagency.com>"