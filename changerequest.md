# Change Request — CR-2026-09-28

**Project:** Talent Casting Expo Backend  
**Date:** 28 September 2026  
**Requested By:** Product Team  
**Status:** ✅ Implemented & Build Verified

---

## CR Summary

Three major features added to the backend:

1. **TRK Code System** — Unique sequential user codes (TRK260001, TRK260002...) generated at registration
2. **Multi-Credential Login** — Users can log in using email, mobile number, or TRK code with password
3. **Admin Dashboard & Audit Logs** — Separate admin panel with full user data access and permanent activity tracking

---

## Change 1: TRK Code — Unique User Identifier

### Requirement
- Every registered user must receive a unique code in the format `TRK` + last 2 digits of year + 4-digit sequential number
- Code must be generated automatically at registration
- Users must be able to login using this code
- Code must be returned in all auth API responses

### Format

```
TRK  +  26  +  0001
 ↑       ↑       ↑
prefix  year  sequence
```

| Year | Codes |
|------|-------|
| 2026 | TRK260001 → TRK260002 → TRK269999 → TRK2610000 |
| 2027 | TRK270001 → TRK270002 → ... |

### Database Change

**Table:** `users`  
**New column:** `trk_code` (text, unique, nullable for backward compatibility)

### Files Changed

| File | Change |
|------|--------|
| `src/db/schema.ts` | Added `trkCode: text('trk_code').unique()` to users table |
| `src/users/user.repository.ts` | Added `generateTrkCode()` — queries max existing code for current year, increments sequence |
| `src/users/user.repository.ts` | Added `findByTrkCode(trkCode)` — lookup user by TRK code |
| `src/auth/auth.service.ts` | Register: generates TRK code before user insert, includes in response |
| `src/auth/auth.service.ts` | Google login: generates TRK code for new Google users |

### TRK Generation Logic (`generateTrkCode()`)

```
1. Get current year suffix → '26'
2. Build prefix → 'TRK26'
3. Query: SELECT trk_code FROM users WHERE trk_code LIKE 'TRK26%' ORDER BY trk_code DESC LIMIT 1
4. If no result → sequence = 1
5. Else → extract number from last code, increment by 1
6. Return → 'TRK26' + padStart(sequence, 4, '0')
```

---

## Change 2: Multi-Credential Login

### Requirement
- Login must accept email + password, mobile + password, or TRK code + password
- Single API endpoint, single request field (`identifier`)
- All three methods lead to the same response

### API Change

**Endpoint:** `POST /auth/login`

**Before:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**After:**
```json
{
  "identifier": "user@example.com",
  "password": "Password123!"
}
```

### Detection Logic

| Condition | Identifier Type | DB Lookup |
|-----------|----------------|-----------|
| Contains `@` | Email | `findByEmail()` |
| Starts with `TRK` (case-insensitive) | TRK Code | `findByTrkCode()` |
| Otherwise | Mobile Number | `findByMobile()` |

### Files Changed

| File | Change |
|------|--------|
| `src/auth/dto/login.dto.ts` | Replaced `email: string` (IsEmail) with `identifier: string` (IsString) |
| `src/auth/auth.service.ts` | Login method: identifier detection → appropriate repository lookup |

### Response Format (unchanged)
```json
{
  "token": "jwt...",
  "user": {
    "id": "uuid",
    "username": "jane_doe",
    "email": "jane@example.com",
    "fullName": "Jane Doe",
    "mobile": "+919876543210",
    "age": 28,
    "gender": "Female",
    "role": "artist",
    "profilePhoto": "url",
    "trkCode": "TRK260001"
  }
}
```

---

## Change 3: Admin Dashboard & Activity Audit Logs

### Requirement
- Separate admin login screen — only database-matched admin credentials allowed
- Regular users (artist/audience) must get **unauthorized** error on admin routes
- Admin can see all users, their complete records, and activity history
- Every user action must be stored permanently for future auditing (even 4+ years)

### 3.1 — Admin Users Table

**New table:** `admin_users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `email` | text (unique) | Admin email |
| `password` | text | bcrypt hashed password |
| `full_name` | text | Display name |
| `role` | text | `admin` or `super_admin` |
| `is_active` | boolean | Account active flag |
| `last_login_at` | timestamp | Last login time |
| `created_at` | timestamp | Account creation time |

**Default admin** (created via `npm run seed:admin`):
- Email: `admin@castingexpo.com`
- Password: `Admin@123`
- Role: `super_admin`

### 3.2 — Admin Authentication

**Guard:** `AdminAuthGuard` — checks JWT for `isAdmin: true` flag

| Scenario | Result |
|----------|--------|
| Valid admin token | ✅ Access granted |
| Valid user token (artist/audience) | ❌ 403 Forbidden: "Unauthorized: Admin access only" |
| No token | ❌ 401 Unauthorized |
| Expired/invalid token | ❌ 401 Unauthorized |

**Admin JWT payload:**
```json
{
  "sub": "admin-uuid",
  "email": "admin@castingexpo.com",
  "adminRole": "super_admin",
  "isAdmin": true
}
```

### 3.3 — Admin API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/login` | None | Admin login |
| `GET` | `/admin/dashboard` | Admin | Platform statistics |
| `GET` | `/admin/users` | Admin | All users (paginated, searchable) |
| `GET` | `/admin/users/:id` | Admin | User full profile + stats |
| `GET` | `/admin/users/:id/videos` | Admin | User's videos |
| `GET` | `/admin/users/:id/auditions` | Admin | User's auditions |
| `GET` | `/admin/users/:id/applications` | Admin | User's applications |
| `GET` | `/admin/users/:id/stories` | Admin | User's stories |
| `GET` | `/admin/users/:id/followers` | Admin | User's followers |
| `GET` | `/admin/users/:id/following` | Admin | User's following |
| `GET` | `/admin/users/:id/activity` | Admin | User's activity logs |
| `GET` | `/admin/activity-logs` | Admin | All platform activity logs |

**Query parameters for `/admin/users`:**
- `page` (default: 1)
- `limit` (default: 20)
- `search` — searches name, email, mobile, TRK code, username
- `role` — `artist`, `audience`, or `all`

**Query parameters for `/admin/activity-logs`:**
- `page` (default: 1)
- `limit` (default: 50)
- `action` — filter by action type
- `userId` — filter by user
- `startDate` / `endDate` — ISO date range

### 3.4 — Dashboard Stats Response

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

### 3.5 — Activity Logs Table

**New table:** `activity_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | Who performed the action |
| `action` | text | Action type identifier |
| `entity` | text | Entity type affected |
| `entity_id` | text | ID of affected entity |
| `details` | JSONB | Extra context data |
| `ip_address` | text | Client IP |
| `user_agent` | text | Client user agent |
| `created_at` | timestamp | When action occurred |

**Indexes:** `user_id`, `action`, `created_at` — optimized for admin queries and date range filtering.

### 3.6 — Supported Action Types

| Action | When Logged |
|--------|-------------|
| `REGISTER` | User creates account |
| `LOGIN` | User logs in (email/mobile/TRK) |
| `PROFILE_UPDATE` | Profile fields updated |
| `VIDEO_UPLOAD` | Video uploaded |
| `AUDITION_CREATE` | Casting call created |
| `APPLICATION_SUBMIT` | Application submitted |
| `FOLLOW` | User followed someone |
| `UNFOLLOW` | User unfollowed someone |
| `STORY_CREATE` | Story posted |
| `COMMENT` | Comment on video |
| `LIKE` | Like on video/comment |
| `REPORT` | Content/user reported |
| `PASSWORD_CHANGE` | Password changed |
| `ADMIN_LOGIN` | Admin panel login |

### 3.7 — ActivityLogService (Global)

Available to all modules without explicit import. Usage:

```typescript
await this.activityLogService.log(
  userId,           // who
  'VIDEO_UPLOAD',   // action
  'video',          // entity type
  videoId,          // entity ID
  { title },        // context JSON
  ipAddress,        // optional
  userAgent,        // optional
);
```

---

## Files Summary

### New Files Created (10)

| File | Purpose |
|------|---------|
| `src/activity-log/activity-log.module.ts` | Global module registration |
| `src/activity-log/activity-log.repository.ts` | DB queries for logs (create, paginate, filter) |
| `src/activity-log/activity-log.service.ts` | Service layer with `log()`, `getUserLogs()`, `getAllLogs()` |
| `src/admin/admin.module.ts` | Admin module registration |
| `src/admin/admin.controller.ts` | 12 REST endpoints |
| `src/admin/admin.service.ts` | Business logic for dashboard, users, logs |
| `src/admin/admin.repository.ts` | All admin DB queries |
| `src/admin/admin-auth.guard.ts` | JWT guard checking `isAdmin: true` |
| `src/admin/dto/admin-login.dto.ts` | Admin login request validation |
| `src/db/seed-admin.ts` | Script to create default super admin |

### Modified Files (6)

| File | What Changed |
|------|-------------|
| `src/db/schema.ts` | Added `trkCode` to users, added `activity_logs` table, added `admin_users` table, updated relations |
| `src/users/user.repository.ts` | Added `generateTrkCode()`, `findByTrkCode()` |
| `src/auth/dto/login.dto.ts` | Changed `email` field → `identifier` field |
| `src/auth/auth.service.ts` | TRK code on register, multi-credential login, trkCode in all responses |
| `src/app.module.ts` | Added `ActivityLogModule`, `AdminModule` to imports |
| `package.json` | Added `seed:admin` script |

---

## Deployment Steps

```bash
# 1. Generate new migration (creates activity_logs, admin_users tables + trk_code column)
npm run generate

# 2. Apply migration to database
npm run migrate

# 3. Create default admin user
npm run seed:admin

# 4. Build the project
npm run build

# 5. Start the server
npm start
```

## Post-Deployment Notes

1. **Existing users** will have `trk_code = NULL`. Run a backfill script if needed to assign TRK codes to existing users.

2. **Activity logging** is infrastructure-ready. The `ActivityLogService` is globally available. To start recording actions from existing controllers (video upload, audition create, follow, etc.), inject the service and add `this.activityLogService.log(...)` calls in each controller method.

3. **Admin password** should be changed after first login in production.

4. **Swagger docs** at `/api/docs` include all new admin endpoints with full request/response schemas.

---

## Testing Checklist

- [ ] Register new user → verify TRK code returned (format: TRK260001)
- [ ] Register second user → verify incremented (TRK260002)
- [ ] Login with email + password → success
- [ ] Login with mobile + password → success
- [ ] Login with TRK code + password → success
- [ ] Login with wrong password → 401 error
- [ ] Admin login with correct credentials → token with isAdmin
- [ ] Admin login with wrong credentials → 401 error
- [ ] Access admin routes with user token → 403 Forbidden
- [ ] Access admin routes with admin token → success
- [ ] GET /admin/dashboard → returns stats
- [ ] GET /admin/users → returns paginated list
- [ ] GET /admin/users?search=jane → filtered results
- [ ] GET /admin/users/:id → full profile with stats
- [ ] GET /admin/users/:id/videos → user's videos
- [ ] GET /admin/users/:id/activity → user's activity logs
- [ ] GET /admin/activity-logs → all logs
- [ ] GET /admin/activity-logs?action=LOGIN → filtered logs
- [ ] Google login for new user → TRK code generated
