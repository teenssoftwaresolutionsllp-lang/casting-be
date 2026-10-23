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
PASSWORD_RESET_ONELINK_URL=https://treeko.onelink.me/CEaN

PASSWORD_RESET_DEV_MODE=true

FACE_ENCRYPTION_KEYS={"1":"<base64-encoded-32-byte-key>"}
FACE_ENCRYPTION_KEY_VERSION=1
FACE_EMBEDDING_LENGTH=512
FACE_DISTANCE_THRESHOLD=0.6
```

Notes:
- `BACKEND_URL` is the public backend origin used for the browser password-reset fallback.
- `PASSWORD_RESET_ONELINK_URL` is the AppsFlyer OneLink base used in password-reset emails. The link passes the single-use token as `token` and `deep_link_sub1`, sets `deep_link_value=reset-password`, and includes `af_dp=treeko://forgotPassword?token=...` for the app's custom-scheme route. Configure the mobile app and AppsFlyer to handle these values.
- The OneLink's `af_web_dp` fallback opens the backend HTML reset form when the app cannot handle the link.
- Face verification requires a JSON key ring in `FACE_ENCRYPTION_KEYS`, keyed by
  integer key version and containing Base64-encoded 32-byte AES keys. Keep
  previous keys in the ring while templates encrypted with those versions
  remain; `FACE_ENCRYPTION_KEY_VERSION` selects the active key.
- Set `FACE_EMBEDDING_LENGTH` to the embedding dimension produced by the
  client-side model and calibrate `FACE_DISTANCE_THRESHOLD` against that model.
  The server compares Euclidean distance and accepts distances at or below the
  threshold.

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

### Live platform statistics

`GET /stats` is a public endpoint that returns current aggregate counts for
users, crafts, gender, states, auditions, applications, media posts, stories,
and recorded views. `updatedAt` indicates when the snapshot was generated;
counts are queried from the database for each request.

Some metrics are not represented in the current data model and are returned as
`null` rather than estimated: audition live/closed totals, image-versus-video
post totals, unique reach, and profile views. Craft counts reflect the
category saved on user profiles; they do not indicate approval status.
`totalMediaPosts` counts records in the shared media table, which includes
photo posts as well as videos.

### Admin user management

All `/admin/users` endpoints below require `Authorization: Bearer <admin-token>`.
Send the admin JWT as a Bearer credential using the authorization request
header. The server verifies the token, confirms that it belongs to an active admin account,
and checks the admin role. Regular user tokens are not accepted.

Supported user roles are `artist` and `audience` (`all` is also accepted as a
list filter). User updates may include only these fields:
`fullName`, `username`, `email`, `role`, `mobile`, `trkCode`, `city`, `state`,
`country`, `gender`, `dateOfBirth`, `occupation`, `bio`, `website`,
`instagramHandle`, `facebookUrl`, `youtubeUrl`, `address`, `postalCode`, and
`languages`. `languages` accepts a string or an array of strings; strings are
split on commas. Empty values clear nullable fields. The server rejects other
fields, including IDs, passwords, verification flags, timestamps, and stats.
Email, role, date, URL, length, and input type validation is applied.

#### List and search users

`GET /admin/users?page=1&limit=20&search=jane&role=artist`

Successful response (`200`):

```json
{
  "data": [
    {
      "id": "user-uuid",
      "fullName": "Jane Doe",
      "username": "jane_doe",
      "email": "jane@example.com",
      "role": "artist",
      "mobile": "+123456789",
      "trkCode": "TRK123",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "gender": "Female",
      "occupation": "Actor",
      "emailVerified": true,
      "createdAt": "2026-01-10T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Search checks name, username, email, mobile, and TRK code. Page must be
positive; limit must be 1-100.

#### Get, update, and inspect a user

- `GET /admin/users/:id` returns one profile object, including nullable profile
  fields and `stats` counts for videos, auditions, applications, stories,
  followers, and following.
- `PATCH /admin/users/:id` accepts only the selected editable fields and returns
  the complete updated profile in the same shape as GET.
- `DELETE /admin/users/:id` deletes the user and related records covered by
  cascading foreign keys, returning `{ "message": "User deleted", "userId":
  "user-uuid" }`.
- `GET /admin/users/:id/videos`, `/auditions`, `/applications`, `/stories`,
  `/followers`, and `/following` each return an array of items with IDs and
  available display fields.
- `GET /admin/users/:id/activity?page=1&limit=10` returns `{ "logs": [...] }`
  and pagination metadata.

Example PATCH request:

```json
{ "fullName": "Jane A. Doe", "city": "Pune" }
```

Example related-data response:

```json
[{ "id": "video-uuid", "title": "Showreel", "category": "Films" }]
```

Successful responses (`200`) for each related-data endpoint:

Videos (`GET /admin/users/:id/videos`):

```json
[{ "id": "video-uuid", "title": "Showreel", "category": "Films" }]
```

Auditions (`GET /admin/users/:id/auditions`):

```json
[{ "id": "audition-uuid", "title": "Casting call", "category": "Film" }]
```

Applications (`GET /admin/users/:id/applications`):

```json
[{ "id": "application-uuid", "auditionTitle": "Casting call", "status": "PENDING" }]
```

Stories (`GET /admin/users/:id/stories`; the schema has no separate story title):

```json
[{ "id": "story-uuid", "createdAt": "2026-02-10T12:00:00.000Z" }]
```

Followers (`GET /admin/users/:id/followers`):

```json
[{ "id": "follower-uuid", "fullName": "Alex User" }]
```

Following (`GET /admin/users/:id/following`):

```json
[{ "id": "following-uuid", "fullName": "Alex User" }]
```

Successful DELETE response:

```json
{ "message": "User deleted", "userId": "user-uuid" }
```

Example profile response (also returned after a successful PATCH):

```json
{
  "id": "user-uuid",
  "fullName": "Jane Doe",
  "username": "jane_doe",
  "email": "jane@example.com",
  "role": "artist",
  "mobile": "+123456789",
  "trkCode": "TRK123",
  "city": "Pune",
  "state": "Maharashtra",
  "country": "India",
  "gender": null,
  "dateOfBirth": null,
  "occupation": null,
  "bio": null,
  "website": null,
  "instagramHandle": null,
  "facebookUrl": null,
  "youtubeUrl": null,
  "address": null,
  "postalCode": null,
  "languages": null,
  "emailVerified": false,
  "createdAt": "2026-01-10T12:00:00.000Z",
  "updatedAt": "2026-02-10T12:00:00.000Z",
  "stats": {
    "videosCount": 1,
    "auditionsCount": 0,
    "applicationsCount": 2,
    "storiesCount": 0,
    "followersCount": 4,
    "followingCount": 3
  }
}
```

The other related-data arrays use these item shapes:

```json
[
  { "id": "audition-uuid", "title": "Casting call", "category": "Film" }
]
```

```json
[
  { "id": "application-uuid", "auditionTitle": "Casting call", "status": "PENDING" }
]
```

```json
[
  { "id": "story-uuid", "createdAt": "2026-02-10T12:00:00.000Z" }
]
```

```json
[{ "id": "follower-uuid", "fullName": "Alex User" }]
```

Example activity response:

```json
{
  "logs": [
    { "id": "log-uuid", "action": "PROFILE_UPDATE", "createdAt": "2026-02-10T12:00:00.000Z" }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

Common error responses:

```json
{ "statusCode": 401, "message": "Invalid or expired authentication token.", "error": "Unauthorized" }
```

```json
{ "statusCode": 403, "message": "Admin access only.", "error": "Forbidden" }
```

```json
{ "statusCode": 400, "message": "Role must be artist or audience.", "error": "Bad Request" }
```

```json
{ "statusCode": 404, "message": "User with ID user-uuid not found.", "error": "Not Found" }
```

The 404 response applies to profile, update, delete, activity, and all six
related-data routes. Invalid IDs, pagination, roles, or PATCH values return
`400 Bad Request`. A blocked deletion returns `409 Conflict`:

```json
{
  "statusCode": 409,
  "message": "User cannot be deleted because related records prevent deletion.",
  "error": "Conflict"
}
```

The `401 Unauthorized` and `403 Forbidden` responses above apply to every
protected endpoint in this section. List validation errors use the same
`400 Bad Request` shape, for example:

```json
{ "statusCode": 400, "message": "Limit must be between 1 and 100.", "error": "Bad Request" }
```

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

### Password Reset Flow

Email link format:

```text
https://treeko.onelink.me/CEaN?deep_link_value=reset-password&token=<single-use-token>&deep_link_sub1=<single-use-token>&af_dp=treeko%3A%2F%2FforgotPassword%3Ftoken%3D<single-use-token>&af_web_dp=<backend-reset-form-url>
```

When the app is installed and configured for the OneLink, opening the email link
navigates to its reset-password screen with the single-use token. The `af_web_dp`
parameter falls back to a browser form to enter and confirm a new password.
Submitting the form posts to `POST /auth/reset-password-form`, which applies the
same token validation and password hashing as the JSON API. The reset token is
passed to AppsFlyer in the OneLink URL to support app routing. The backend
browser form disables caching and referrers and does not load third-party
resources.

Clients that reset passwords through the API can continue to use:

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

Video and photo posts can be deleted by their creator:

```text
DELETE /videos/:id
DELETE /photos/:id
```

Both endpoints require a JWT and return `{ "deleted": true }`. Only the user
who created the post can delete it; attempts by other users return `403`, and
unknown IDs return `404`. Photo posts are stored in the videos table, so the
video endpoint can also delete a photo post by ID.

## Stories API

Stories remain active for 24 hours and allow image or video uploads.

Endpoints:

- `POST /stories`
- `GET /stories/feed`
- `POST /stories/:id/views`
- `DELETE /stories/:id`

## Face Verification API

Face verification is an optional second factor for JWT-authenticated users.
Apply the exported `FaceVerifiedGuard` and `@RequireFaceVerification('purpose')`
to routes that need it, alongside the route's normal JWT and role guards. The
guard requires an `X-Face-Token` issued to the same user for that exact purpose.

All routes below require `Authorization: Bearer <JWT>`:

- `POST /face/consent` with `{ "version": "consent-version" }` records
  biometric consent.
- `POST /face/enroll` with
  `{ "embedding": [0.1, 0.2], "modelVersion": "model-v1", "sampleCount": 3 }`
  stores the embedding encrypted with AES-256-GCM. It requires consent and a
  bearer JWT issued within the previous five minutes. The embedding length must
  equal `FACE_EMBEDDING_LENGTH`.
- `POST /face/challenge` with `{ "purpose": "sensitive-action" }` returns
  `{ "challengeId": "...", "expiresAt": "..." }`. The challenge is single-use
  and expires after 60 seconds.
- `POST /face/verify` with
  `{ "challengeId": "...", "embedding": [0.1, 0.2], "livenessPassed": true, "deviceId": "..." }`
  returns `{ "faceToken": "...", "expiresIn": 300 }` on success. The token is
  valid for five minutes and is bound to the request user and challenge purpose.
- `GET /face/status` reports enrollment and latest consent state.
- `DELETE /face/enroll` hard-deletes the user's face templates and writes an
  activity-log audit entry.

Verification is limited to 10 attempts per user and IP per minute. Five
consecutive failed attempts lock verification for 15 minutes. Generic response
codes include `FACE_NOT_ENROLLED`, `FACE_MISMATCH`, `LIVENESS_FAILED`,
`CHALLENGE_EXPIRED`, and `FACE_LOCKED`. Face embeddings and decrypted templates
are never logged.

`livenessPassed` is a client-provided assertion in this API contract; the
backend rejects `false` but does not independently validate liveness or a
device-attested proof. A production client must use a trustworthy liveness
implementation and should add server-verifiable attestation if clients are
considered untrusted.

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
- backend env includes `BACKEND_URL`
- frontend env points to the backend URL

Example backend URL:

```text
https://casting-be.vercel.app
```

## Notes

- Admin and user authentication are completely separate.
- Artists can register and fill profile information later.
- Password reset emails open the app's reset-password screen through AppsFlyer OneLink when available, with the backend-hosted HTML form as a web fallback.
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