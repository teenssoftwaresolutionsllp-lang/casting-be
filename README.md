# Talent Casting Expo Backend

This is the NestJS backend for the Talent Casting mobile application. It uses a scalable, modular MVC architecture (Controller -> Service -> Repository) and relies on Drizzle ORM for PostgreSQL and Cloudinary for media uploads.

## Prerequisites
- Node.js (v16+)
- PostgreSQL (ensure a database is created)
- Cloudinary Account (optional but recommended for media uploads, falls back to mock images if missing)

## Environment Variables
Create a `.env` file in the root directory and copy the contents from `.env.example`:

```env
# Server Port
PORT=3000

# Database Connection
# Replace with your actual Postgres connection string
DATABASE_URL="postgres://postgres:password@localhost:5432/castingdb"

# JWT Secret
JWT_SECRET="supersecretjwtkeyforcastingapp2026"

# Cloudinary Setup (Optional - Falls back to mock if not provided)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

## Installation

```bash
# Install dependencies
npm install
```

## Database Migrations (Drizzle)

This project uses Drizzle ORM for robust and type-safe database interactions.

```bash
# Generate the SQL migration files from src/db/schema.ts
npm run generate

# Apply the migrations to your Postgres database
npm run migrate

# Seed the default admin user (first time only)
npm run seed:admin
```

Run migrations after pulling schema changes and before starting the API. The stories endpoints require migrations `0002_plain_roland_deschain` and `0003_exotic_zeigeist`; without them, PostgreSQL reports `relation "stories" does not exist`.

## Running the app

```bash
# development
npm run start

# watch mode (Recommended for dev)
npm run start:dev

# production mode
npm run start:prod
```

## API Documentation (Swagger)

All A-Z APIs are documented using Swagger. Once the app is running (e.g. `npm run start:dev`), you can view the complete API documentation at:

[http://localhost:3000/api/docs](http://localhost:3000/api/docs)

From the Swagger UI, you can:
- Explore all endpoints and their expected payloads/responses.
- Authenticate via the "Authorize" button by passing a valid JWT token.
- Test endpoints directly within the browser.

---

## TRK Code — Unique User Identifier

Every user is assigned a unique **TRK Code** at registration.

| Component | Description | Example |
|-----------|-------------|---------|
| `TRK` | Fixed prefix | `TRK` |
| `26` | Last 2 digits of registration year | `26` (for 2026) |
| `0001` | Sequential number (auto-increments) | `0001` → `0002` → `9999` → `10000` |

**Full example:** `TRK260001`, `TRK260002`, `TRK270001` (2027 resets sequence)

- Generated automatically during registration (including Google sign-up)
- Returned in all authentication responses
- Can be used as a login credential (see below)

---

## Authentication API

### Register — `POST /auth/register`

Creates a new user account with auto-generated TRK code.

**Required fields:** `username`, `email`, `password` (min 6 chars), `role` (`artist` | `audience`), `mobile`, `age`, `gender`

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

**Response includes:**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "trkCode": "TRK260001",
    "username": "jane_doe",
    "email": "jane@example.com",
    "role": "artist"
  }
}
```

> **Audience users** see 100% profile completion after registration. **Artist users** must complete additional profile fields via the "Complete Profile" flow.

### Login — `POST /auth/login`

Accepts **three login methods** via a single `identifier` field:

| Method | Example `identifier` |
|--------|---------------------|
| Email | `jane@example.com` |
| Mobile | `+919876543210` |
| TRK Code | `TRK260001` |

```json
{
  "identifier": "TRK260001",
  "password": "Password123!"
}
```

**Detection logic:**
- Contains `@` → email lookup
- Starts with `TRK` (case-insensitive) → TRK code lookup
- Otherwise → mobile number lookup

### Google Login — `POST /auth/google`

Firebase Google ID token authentication. Auto-creates user with TRK code if new.

---

## Admin Dashboard API

The admin system is **completely separate** from regular user authentication. Admin credentials are stored in a dedicated `admin_users` table.

### Admin Authentication

**Default credentials** (created via `npm run seed:admin`):
```
Email:    admin@castingexpo.com
Password: Admin@123
```

### `POST /admin/login`
No auth guard — this is the entry point for admin access.

```json
{
  "email": "admin@castingexpo.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "token": "eyJhbG...",
  "admin": {
    "id": "uuid",
    "email": "admin@castingexpo.com",
    "fullName": "Super Admin",
    "role": "super_admin"
  }
}
```

> The admin JWT includes `isAdmin: true`. Regular user tokens (artist/audience) will receive **403 Forbidden** on all admin routes.

### Admin Endpoints

All routes below require the admin Bearer token.

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/dashboard` | Platform-wide statistics |

**Dashboard response:**
```json
{
  "totalUsers": 150,
  "totalArtists": 90,
  "totalAudiences": 60,
  "totalVideos": 320,
  "totalAuditions": 45,
  "totalApplications": 210,
  "newUsersToday": 5,
  "newUsersThisWeek": 22,
  "newUsersThisMonth": 68
}
```

#### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users?page=1&limit=20&search=&role=` | List all users (paginated, searchable by name/email/mobile/TRK/username, filterable by role) |
| `GET` | `/admin/users/:id` | Full user profile with stats (videos, auditions, applications, followers, following counts) |
| `GET` | `/admin/users/:id/videos` | All videos uploaded by user |
| `GET` | `/admin/users/:id/auditions` | All auditions/casting calls created by user |
| `GET` | `/admin/users/:id/applications` | All applications submitted by user |
| `GET` | `/admin/users/:id/stories` | All stories posted by user |
| `GET` | `/admin/users/:id/followers` | User's followers list |
| `GET` | `/admin/users/:id/following` | User's following list |

#### Activity / Audit Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/users/:id/activity?page=1&limit=50` | Activity logs for a specific user |
| `GET` | `/admin/activity-logs?page=1&limit=50&action=&userId=&startDate=&endDate=` | All platform activity logs with filters |

**Filter parameters for `/admin/activity-logs`:**
- `action` — Filter by action type (e.g., `LOGIN`, `REGISTER`, `VIDEO_UPLOAD`)
- `userId` — Filter by specific user ID
- `startDate` / `endDate` — ISO date range filter

---

## Activity Audit Log System

Every user action is permanently recorded in the `activity_logs` table for historical tracking.

### Tracked Action Types

| Action | Trigger |
|--------|---------|
| `REGISTER` | New user registration |
| `LOGIN` | User login (any method) |
| `PROFILE_UPDATE` | Profile details changed |
| `VIDEO_UPLOAD` | New video uploaded |
| `AUDITION_CREATE` | New audition/casting call created |
| `APPLICATION_SUBMIT` | Application submitted to an audition |
| `FOLLOW` | User followed another user |
| `UNFOLLOW` | User unfollowed another user |
| `STORY_CREATE` | New story posted |
| `COMMENT` | Comment posted on a video |
| `LIKE` | Video or comment liked |
| `REPORT` | Content or user reported |
| `PASSWORD_CHANGE` | Password updated |
| `ADMIN_LOGIN` | Admin panel login |

### Log Entry Structure

Each log entry stores:
- **userId** — Who performed the action
- **action** — What action was performed
- **entity** / **entityId** — What object was affected (e.g., `video`, `audition`)
- **details** — JSON metadata with additional context
- **ipAddress** / **userAgent** — Client information
- **createdAt** — Timestamp (stored permanently, never deleted)

### Developer Usage

`ActivityLogService` is globally available. Inject it in any controller/service:

```typescript
constructor(private readonly activityLogService: ActivityLogService) {}

// Log an action
await this.activityLogService.log(
  userId,           // who
  'VIDEO_UPLOAD',   // action
  'video',          // entity type
  videoId,          // entity ID
  { title: 'My Reel' },  // extra details (JSON)
  req.ip,           // IP address
  req.headers['user-agent'], // user agent
);
```

---

## Stories API

All story endpoints require a JWT bearer token. Stories accept image or video uploads through Cloudinary and remain active for 24 hours.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/stories` | Upload a multipart `file` image or video and create a story. |
| `GET` | `/stories/feed?limit=20&offset=0` | Get active stories grouped by account, including per-story viewed status. `limit` is capped at 50. |
| `POST` | `/stories/:id/views` | Mark an active story as viewed. Repeated requests are safe. |
| `DELETE` | `/stories/:id` | Delete a story owned by the authenticated account. |

To upload, send `multipart/form-data` with a `file` field. The feed excludes expired stories; pagination is by account, so a creator's active stories are returned together.

---

## Architecture

- **Auth**: JWT generation and verification. Multi-credential login (email/mobile/TRK code). Google Firebase auth.
- **Users**: Artist profiles, Audience profiles, TRK code assignment, followers logic, profile completion tracking.
- **Videos**: Feed algorithm, liking, commenting.
- **Auditions**: Casting call creation and discovery.
- **Applications**: Linking Actors to Auditions.
- **Chat**: 1:1 real-time messaging structures.
- **Notifications**: Internal alert tracking.
- **Media**: Cloudinary integration for scalable assets.
- **Stories**: 24-hour image/video stories, grouped feeds, view tracking, and owner-only deletion.
- **Activity Log**: Global audit trail recording all user actions permanently.
- **Admin**: Separate admin authentication, dashboard stats, full user management, and activity log viewer.

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (artist/audience) with TRK codes |
| `follows` | User follow relationships |
| `videos` | Uploaded video content |
| `video_likes` | Video like records |
| `comments` | Video comments |
| `comment_likes` | Comment like records |
| `auditions` | Casting calls |
| `applications` | Audition applications |
| `stories` | 24-hour stories |
| `story_views` | Story view tracking |
| `chats` | Chat conversations |
| `chat_participants` | Chat membership |
| `messages` | Chat messages |
| `notifications` | User notifications |
| `activity_logs` | Audit trail (permanent) |
| `admin_users` | Admin credentials (separate from users) |

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node dist/src/main.js` | Start production server |
| `start:dev` | `nest start --watch` | Start dev server with hot reload |
| `build` | `nest build` | Compile TypeScript |
| `generate` | `drizzle-kit generate` | Generate DB migration files |
| `migrate` | `ts-node src/db/migrate.ts` | Apply DB migrations |
| `seed` | `ts-node src/db/seed.ts` | Seed sample data |
| `seed:admin` | `ts-node src/db/seed-admin.ts` | Create default admin user |
| `test` | `jest` | Run unit tests |
| `lint` | `eslint --fix` | Lint and auto-fix |

RESEND_API_KEY=your_resend_api_key