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

## Stories API

All story endpoints require a JWT bearer token. Stories accept image or video uploads through Cloudinary and remain active for 24 hours.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/stories` | Upload a multipart `file` image or video and create a story. |
| `GET` | `/stories/feed?limit=20&offset=0` | Get active stories grouped by account, including per-story viewed status. `limit` is capped at 50. |
| `POST` | `/stories/:id/views` | Mark an active story as viewed. Repeated requests are safe. |
| `DELETE` | `/stories/:id` | Delete a story owned by the authenticated account. |

To upload, send `multipart/form-data` with a `file` field. The feed excludes expired stories; pagination is by account, so a creator's active stories are returned together.

## Architecture

- **Auth**: JWT generation and Passport verification, Role-based decorators.
- **Users**: Actor profiles, Audience profiles, followers logic.
- **Videos**: Feed algorithm, liking, commenting.
- **Auditions**: Casting call creation and discovery.
- **Applications**: Linking Actors to Auditions.
- **Chat**: 1:1 real-time messaging structures.
- **Notifications**: Internal alert tracking.
- **Media**: Cloudinary integration for scalable assets.
- **Stories**: 24-hour image/video stories, grouped feeds, view tracking, and owner-only deletion.

