import { pgTable, uuid, text, integer, boolean, timestamp, primaryKey, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// USERS TABLE
// ==========================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique(),
  mobile: text('mobile'),
  password: text('password').notNull(),
  fullName: text('full_name').notNull(),
  stageName: text('stage_name'),
  dob: text('dob'),
  gender: text('gender'),
  country: text('country'),
  state: text('state'),
  city: text('city'),
  profilePhoto: text('profile_photo'),
  role: text('role').notNull(), // 'artist' | 'audience'
  
  // Professional Specs (Artist role)
  category: text('category'), // 'Actor' | 'Actress' | 'Model' | 'Dancer' etc.
  experience: text('experience'),
  skills: jsonb('skills').$type<string[]>(),
  languages: jsonb('languages').$type<string[]>(),
  preferredLanguage: jsonb('preferred_language').$type<string[]>(),
  qualification: text('qualification'),
  institute: text('institute'),
  occupation: text('occupation'),
  availableFor: jsonb('available_for').$type<string[]>(),
  union: text('union'), // 'Yes' | 'No'
  relocate: text('relocate'), // 'Yes' | 'No'

  // Physical Specs
  height: integer('height'), // in cm
  weight: integer('weight'), // in kg
  bodyType: text('body_type'),
  skinTone: text('skin_tone'),
  hairColor: text('hair_color'),
  eyeColor: text('eye_color'),
  preferredRole: jsonb('preferred_role').$type<string[]>(),
  travelAvailability: text('travel_availability'),
  nightShoots: text('night_shoots'), // 'Yes' | 'No'

  // Portfolio & Media
  headshot: text('headshot'),
  fullBody: text('full_body'),
  introVideo: text('intro_video'),
  previousWork: jsonb('previous_work').$type<string[]>(),
  instagram: text('instagram'),
  youtube: text('youtube'),
  imdb: text('imdb'),
  website: text('website'),
  resume: text('resume'),
  awards: text('awards'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// FOLLOWS RELATIONSHIP TABLE (Self-referencing Many-to-Many)
// ==========================================
export const follows = pgTable('follows', {
  followerId: uuid('follower_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
  return [
    {
      pk: primaryKey({ columns: [table.followerId, table.followingId] }),
    }
  ];
});

// ==========================================
// VIDEOS TABLE
// ==========================================
export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: text('category').notNull(), // 'Films' | 'Ads' | 'TV' | 'Music Videos'
  title: text('title').notNull(),
  desc: text('desc').notNull(),
  url: text('url').notNull(), // Cloudinary URL
  thumb: text('thumb').notNull(), // Thumbnail URL
  viewsCount: integer('views_count').default(0).notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// VIDEO LIKES TABLE
// ==========================================
export const videoLikes = pgTable('video_likes', {
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
  return [
    {
      pk: primaryKey({ columns: [table.videoId, table.userId] }),
    }
  ];
});

// ==========================================
// COMMENTS TABLE
// ==========================================
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  likesCount: integer('likes_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// COMMENT LIKES TABLE
// ==========================================
export const commentLikes = pgTable('comment_likes', {
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
  return [
    {
      pk: primaryKey({ columns: [table.commentId, table.userId] }),
    }
  ];
});

// ==========================================
// AUDITIONS TABLE (Casting Calls)
// ==========================================
export const auditions = pgTable('auditions', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Film' | 'Ad' | 'Dancer' | 'TV'
  role: text('role').notNull(),
  location: text('location').notNull(),
  pay: text('pay').notNull(),
  deadline: text('deadline').notNull(),
  lang: text('lang').notNull(),
  desc: text('desc').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// APPLICATIONS TABLE
// ==========================================
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  auditionId: uuid('audition_id').references(() => auditions.id, { onDelete: 'cascade' }).notNull(),
  applicantId: uuid('applicant_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  coverLetter: text('cover_letter').notNull(),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED'
  details: text('details').default('Pending selection decision callback from review agency panel.').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// CHATS TABLE
// ==========================================
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// CHAT PARTICIPANTS TABLE
// ==========================================
export const chatParticipants = pgTable('chat_participants', {
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
}, (table) => {
  return [
    {
      pk: primaryKey({ columns: [table.chatId, table.userId] }),
    }
  ];
});

// ==========================================
// MESSAGES TABLE
// ==========================================
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// NOTIFICATIONS TABLE
// ==========================================
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  text: text('text').notNull(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// RELATIONS DEFINITIONS (For ease of querying in ORM if needed)
// ==========================================
export const usersRelations = relations(users, ({ many }) => ({
  videos: many(videos),
  videoLikes: many(videoLikes),
  comments: many(comments),
  commentLikes: many(commentLikes),
  auditions: many(auditions),
  applications: many(applications),
  notifications: many(notifications),
  chatParticipants: many(chatParticipants),
  messages: many(messages),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  creator: one(users, { fields: [videos.creatorId], references: [users.id] }),
  likes: many(videoLikes),
  comments: many(comments),
}));

export const videoLikesRelations = relations(videoLikes, ({ one }) => ({
  video: one(videos, { fields: [videoLikes.videoId], references: [videos.id] }),
  user: one(users, { fields: [videoLikes.userId], references: [users.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  video: one(videos, { fields: [comments.videoId], references: [videos.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  likes: many(commentLikes),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, { fields: [commentLikes.commentId], references: [comments.id] }),
  user: one(users, { fields: [commentLikes.userId], references: [users.id] }),
}));

export const auditionsRelations = relations(auditions, ({ one, many }) => ({
  creator: one(users, { fields: [auditions.creatorId], references: [users.id] }),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  audition: one(auditions, { fields: [applications.auditionId], references: [auditions.id] }),
  applicant: one(users, { fields: [applications.applicantId], references: [users.id] }),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  participants: many(chatParticipants),
  messages: many(messages),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  chat: one(chats, { fields: [chatParticipants.chatId], references: [chats.id] }),
  user: one(users, { fields: [chatParticipants.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
