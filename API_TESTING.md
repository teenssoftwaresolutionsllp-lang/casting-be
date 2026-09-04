# Casting API Testing Guide

This guide uses `curl.exe`, so it works in Windows PowerShell. The backend has no `/api` prefix.

## 1. Start the backend

```powershell
npm install
npm run migrate
npm run start:dev
```

The correct watch-mode command is `npm run start:dev`; `npm run dev` is not defined.

Useful URLs:

- Health: `http://localhost:3000/`
- Swagger: `http://localhost:3000/api/docs`

The database migration must be applied after schema changes. In particular, `npm run migrate` applies the unique mobile-number constraint.

## 2. Authentication setup

### Register user A

Use a new email for every registration test.

```powershell
curl.exe -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"artist-a@example.com","password":"Password123!","fullName":"Artist A","role":"artist","mobile":"+919876543210"}'
```

Copy the returned `token`:

```text
TOKEN_A=<token returned above>
```

### Register user B

```powershell
curl.exe -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"artist-b@example.com","password":"Password123!","fullName":"Artist B","role":"artist","mobile":"+919876543211"}'
```

Copy the returned token and user ID:

```text
TOKEN_B=<token returned above>
USER_B_ID=<user.id returned above>
```

### Login later

```powershell
curl.exe -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"artist-a@example.com","password":"Password123!"}'
```

All protected requests use:

```text
Authorization: Bearer TOKEN_A
```

## 3. Profile APIs

### Read your profile

```powershell
curl.exe http://localhost:3000/profile/me `
  -H "Authorization: Bearer TOKEN_A"
```

### Update your profile

```powershell
curl.exe -X PATCH http://localhost:3000/profile/me `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"bio":"Updated profile bio","city":"Mumbai","category":"Actor"}'
```

### View another profile: profile visit test

This endpoint both returns the public profile and consumes one daily profile-view quota for the logged-in user. The first request needs `USER_B_ID` from registration or from explore.

```powershell
curl.exe http://localhost:3000/users/USER_B_ID `
  -H "Authorization: Bearer TOKEN_A"
```

Repeat the command. A free user can view 5 other profiles per 24-hour reset window. After the limit, the response is HTTP `403`:

```json
{
  "statusCode": 403,
  "message": "Daily profile view limit reached. Upgrade your plan to view more profiles.",
  "paywall": true,
  "remaining": 0
}
```

Viewing your own profile does not consume the quota. There is currently no profile-visit history/list endpoint.

### Explore and scroll test

```powershell
curl.exe "http://localhost:3000/users/explore?category=Actor" `
  -H "Authorization: Bearer TOKEN_A"
```

The response contains `profiles`, `remaining`, `hasMore`, and `paywall`. Treat one returned profile as one consumed scroll profile. A free user can scroll through 20 profiles per 24-hour reset window. When exhausted, the API returns an empty list with `paywall: true` and `hasMore: false`.

The client must stop requesting more explore results when `hasMore` is `false` or `paywall` is `true`.

### Follow or unfollow 

```powershell
curl.exe -X POST http://localhost:3000/users/USER_B_ID/follow `
  -H "Authorization: Bearer TOKEN_A"
```

The same request toggles the relationship back to unfollow.

## 4. Video APIs and likes

### Create a video

```powershell
curl.exe -X POST http://localhost:3000/videos `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"category":"Actor","title":"Demo reel","desc":"My demo reel","url":"https://example.com/video.mp4","thumb":"https://example.com/thumb.jpg"}'
```

Copy the returned ID:

```text
VIDEO_ID=<video.id returned above>
```

### Get feed

```powershell
curl.exe http://localhost:3000/videos `
  -H "Authorization: Bearer TOKEN_A"
```

Optional filter:

```powershell
curl.exe "http://localhost:3000/videos?category=Actor" `
  -H "Authorization: Bearer TOKEN_A"
```

### Like or unlike a video

```powershell
curl.exe -X POST http://localhost:3000/videos/VIDEO_ID/like `
  -H "Authorization: Bearer TOKEN_A"
```

This is a toggle. The first call likes the video and consumes one like quota. The second call unlikes it and does not refund the consumed quota.

Free users have 20 new likes per day. To test denial, create or use a free account and call the like endpoint on 21 different videos. The 21st new like returns HTTP `403` with `paywall: true` and `remaining: 0`.

### Video view counter

```powershell
curl.exe -X POST http://localhost:3000/videos/VIDEO_ID/view `
  -H "Authorization: Bearer TOKEN_A"
```

This increments the content view counter and does not consume the profile-view quota.

### Video comments

```powershell
curl.exe http://localhost:3000/videos/VIDEO_ID/comments `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/videos/VIDEO_ID/comments `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"text":"Great performance"}'
```

For a free user, comments are locked until the user has made 20 likes today. After 20 likes, up to 2 comments/day are allowed. Paid plans have their own comment limits.

### Like or unlike a video comment

```powershell
curl.exe -X POST http://localhost:3000/videos/comments/COMMENT_ID/like `
  -H "Authorization: Bearer TOKEN_A"
```

## 5. Photo APIs

Photo creation and feed APIs use the same pattern as videos:

```powershell
curl.exe -X POST http://localhost:3000/photos `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"category":"Actor","title":"Headshot","desc":"Recent headshot","url":"https://example.com/photo.jpg","thumb":"https://example.com/thumb.jpg"}'
```

```powershell
curl.exe http://localhost:3000/photos `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/photos/PHOTO_ID/like `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/photos/PHOTO_ID/view `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe http://localhost:3000/photos/PHOTO_ID/comments `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/photos/PHOTO_ID/comments `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"text":"Nice photo"}'
```

```powershell
curl.exe -X POST http://localhost:3000/photos/comments/PHOTO_COMMENT_ID/like `
  -H "Authorization: Bearer TOKEN_A"
```

Photo likes and comments use the same daily quota policy as video likes and comments.

## 6. Auditions and applications

### Create an audition

```powershell
curl.exe -X POST http://localhost:3000/auditions `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"title":"Lead role","category":"Actor","role":"Lead","location":"Mumbai","pay":"50000","deadline":"2026-12-31","lang":"Hindi","desc":"Feature film role"}'
```

Copy `AUDITION_ID` from the response.

```powershell
curl.exe http://localhost:3000/auditions `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe http://localhost:3000/auditions/AUDITION_ID `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe http://localhost:3000/auditions/my-posted `
  -H "Authorization: Bearer TOKEN_A"
```

### Apply as user B

This requires `TOKEN_B` and `AUDITION_ID`, and must be a different user from the audition creator.

```powershell
curl.exe -X POST http://localhost:3000/auditions/AUDITION_ID/apply `
  -H "Authorization: Bearer TOKEN_B" `
  -H "Content-Type: application/json" `
  -d '{"coverLetter":"I would like to audition for this role."}'
```

```powershell
curl.exe http://localhost:3000/applications/me `
  -H "Authorization: Bearer TOKEN_B"
```

Copy `APPLICATION_ID` from the response.

```powershell
curl.exe -X PATCH http://localhost:3000/applications/APPLICATION_ID/status `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"status":"SHORTLISTED","details":"Shortlisted for the next round."}'
```

Only the audition creator can update application status.

```powershell
curl.exe -X DELETE http://localhost:3000/applications/APPLICATION_ID `
  -H "Authorization: Bearer TOKEN_B"
```

## 7. Chat APIs

`USER_B_ID` must belong to another registered user.

```powershell
curl.exe -X POST http://localhost:3000/chats/start/USER_B_ID `
  -H "Authorization: Bearer TOKEN_A"
```

Copy `CHAT_ID` from the response.

```powershell
curl.exe http://localhost:3000/chats `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe http://localhost:3000/chats/CHAT_ID/messages `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/chats/CHAT_ID/messages `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"text":"Hello from the casting app"}'
```

Use `TOKEN_B` to read the same chat and message list. A non-participant receives HTTP `403`.

## 8. Notifications

Notifications are normally created by actions such as follows, applications, comments, and messages.

```powershell
curl.exe http://localhost:3000/notifications `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X POST http://localhost:3000/notifications/read-all `
  -H "Authorization: Bearer TOKEN_A"
```

```powershell
curl.exe -X DELETE http://localhost:3000/notifications `
  -H "Authorization: Bearer TOKEN_A"
```

## 9. Subscription and quota APIs

### Check current plan and remaining quota

```powershell
curl.exe http://localhost:3000/subscriptions/me `
  -H "Authorization: Bearer TOKEN_A"
```

The response shows `plan`, `limits`, `usedToday`, `remainingToday`, and the free-comment rule.

Current limits:

| Plan | New likes/day | Comments/day | Other profiles/day | Explore profiles/day |
|---|---:|---:|---:|---:|
| free | 20 | 2 after 20 likes | 5 | 20 |
| pro | 200 | 30 | 100 | 100 |
| pro_max | 500 | 100 | 500 | 500 |

Counters reset automatically after 24 hours. The server reads plan status from the database. An expired, invalid, or inactive paid subscription is treated as `free`.

### Create a paid checkout

This requires Razorpay configuration and creates an order only. It does not activate the plan.

```powershell
curl.exe -X POST http://localhost:3000/payments/checkout `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"plan":"pro"}'
```

Supported plans are `pro` and `pro_max`.

### Verify payment

After a successful Razorpay payment, send the real values returned by Razorpay:

```powershell
curl.exe -X POST http://localhost:3000/payments/verify `
  -H "Authorization: Bearer TOKEN_A" `
  -H "Content-Type: application/json" `
  -d '{"razorpayOrderId":"order_xxx","razorpayPaymentId":"pay_xxx","razorpaySignature":"signature_xxx"}'
```

Do not use fake values for this endpoint. The server verifies the signature, order ownership, payment status, selected plan, and amount before activating the subscription.

## 10. Media uploads

### Generic upload

This endpoint is currently public and requires multipart form data.

```powershell
curl.exe -X POST http://localhost:3000/media/upload `
  -F "file=@C:\temp\sample.jpg"
```

### Video upload

```powershell
curl.exe -X POST http://localhost:3000/videos/upload `
  -H "Authorization: Bearer TOKEN_A" `
  -F "file=@C:\temp\sample.mp4" `
  -F "title=Uploaded reel" `
  -F "description=Test upload" `
  -F "category=Actor"
```

### Photo upload

```powershell
curl.exe -X POST http://localhost:3000/photos/upload `
  -H "Authorization: Bearer TOKEN_A" `
  -F "file=@C:\temp\sample.jpg" `
  -F "title=Uploaded headshot" `
  -F "description=Test upload"
```

Upload limits are 100 MB for generic media, 500 MB for videos, and 50 MB for photos.

## 11. How free-user denial works

The client does not decide whether a user is paid. For likes, comments, profile visits, and explore scrolling, the server:

1. Loads the user and subscription from PostgreSQL.
2. Resets daily counters when the 24-hour window expires.
3. Treats expired or invalid paid subscriptions as `free`.
4. Atomically checks and increments the relevant counter.
5. Returns a paywall response when the limit is exhausted.

For a denied action, handle HTTP `403` and show an upgrade flow when `paywall` is `true`:

```json
{
  "statusCode": 403,
  "message": "Daily like limit reached. Upgrade your plan to like more content.",
  "paywall": true,
  "remaining": 0
}
```

For explore, the endpoint returns a normal `200` response with `profiles: []`, `paywall: true`, and `hasMore: false` so the client can stop scrolling without retrying.

## 12. Common failures

- `401 Unauthorized`: missing, expired, or malformed `Authorization: Bearer TOKEN` header.
- `403 Forbidden`: quota exhausted or user is not allowed to access that resource.
- `404 Not Found`: the copied ID does not exist.
- Duplicate mobile registration: apply migrations with `npm run migrate`, then restart the backend using `npm run start:dev`.
- PowerShell command issues: use `curl.exe`, not the PowerShell `curl` alias, and use the backtick continuation character shown above.
