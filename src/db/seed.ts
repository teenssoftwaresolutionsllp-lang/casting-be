import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Starting seed...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/castingdb',
  });
  const db = drizzle(pool, { schema });

  try {
    // 1. User
    const [user] = await db.insert(schema.users).values({
      email: 'seeduser@example.com',
      password: 'hashedpassword123',
      fullName: 'Seed Actor',
      role: 'artist',
      stageName: 'SeedStar',
    }).returning();
    console.log('Seeded 1 User');

    // 2. Follows
    await db.insert(schema.follows).values({
      followerId: user.id,
      followingId: user.id, // self-follow just to satisfy the 1 row constraint simply
    });
    console.log('Seeded 1 Follow');

    // 3. Video
    const [video] = await db.insert(schema.videos).values({
      creatorId: user.id,
      category: 'Films',
      title: 'My First Audition Tape',
      desc: 'This is a sample video for testing.',
      url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumb: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    }).returning();
    console.log('Seeded 1 Video');

    // 4. Video Likes
    await db.insert(schema.videoLikes).values({
      videoId: video.id,
      userId: user.id,
    });
    console.log('Seeded 1 Video Like');

    // 5. Comments
    const [comment] = await db.insert(schema.comments).values({
      videoId: video.id,
      userId: user.id,
      text: 'Great performance!',
    }).returning();
    console.log('Seeded 1 Comment');

    // 6. Comment Likes
    await db.insert(schema.commentLikes).values({
      commentId: comment.id,
      userId: user.id,
    });
    console.log('Seeded 1 Comment Like');

    // 7. Auditions
    const [audition] = await db.insert(schema.auditions).values({
      creatorId: user.id,
      title: 'Lead Actor for Sci-Fi Short',
      category: 'Film',
      role: 'Lead',
      location: 'New York / Remote',
      pay: '$500/day',
      deadline: '2026-12-31',
      lang: 'English',
      desc: 'Looking for a talented actor to play the lead in an upcoming indie sci-fi short film.',
    }).returning();
    console.log('Seeded 1 Audition');

    // 8. Applications
    await db.insert(schema.applications).values({
      auditionId: audition.id,
      applicantId: user.id,
      coverLetter: 'I am highly interested in this role and have experience in sci-fi.',
    });
    console.log('Seeded 1 Application');

    // 9. Chats
    const [chat] = await db.insert(schema.chats).values({}).returning();
    console.log('Seeded 1 Chat');

    // 10. Chat Participants
    await db.insert(schema.chatParticipants).values({
      chatId: chat.id,
      userId: user.id,
    });
    console.log('Seeded 1 Chat Participant');

    // 11. Messages
    await db.insert(schema.messages).values({
      chatId: chat.id,
      senderId: user.id,
      text: 'Hello, is this role still available?',
    });
    console.log('Seeded 1 Message');

    // 12. Notifications
    await db.insert(schema.notifications).values({
      userId: user.id,
      title: 'Welcome',
      text: 'Welcome to the Talent Casting App!',
    });
    console.log('Seeded 1 Notification');

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await pool.end();
  }
}

main();
