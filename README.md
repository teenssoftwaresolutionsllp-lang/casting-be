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

## Architecture

- **Auth**: JWT generation and Passport verification, Role-based decorators.
- **Users**: Actor profiles, Audience profiles, followers logic.
- **Videos**: Feed algorithm, liking, commenting.
- **Auditions**: Casting call creation and discovery.
- **Applications**: Linking Actors to Auditions.
- **Chat**: 1:1 real-time messaging structures.
- **Notifications**: Internal alert tracking.
- **Media**: Cloudinary integration for scalable assets.



Neon - url : postgresql://neondb_owner:npg_0xDaP1AoKMCS@ep-square-lake-a51ed5rm-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

