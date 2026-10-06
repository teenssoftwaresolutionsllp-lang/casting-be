import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcrypt';

const portraitUrls = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=85',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=85&sat=-20',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85&sat=-20',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=85&sat=-20',
];

const sampleVideoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const profileData: Array<Omit<typeof schema.users.$inferInsert, 'password'>> = [
  {
    username: 'arjun_mehta', email: 'seeduser@example.com', mobile: '+919876540001',
    fullName: 'Arjun Mehta', stageName: 'Arjun M.', age: 28, gender: 'Male',
    country: 'India', state: 'Maharashtra', city: 'Mumbai', role: 'artist', category: 'Actor',
    experience: '5-7 Years', skills: ['Screen Acting', 'Improvisation', 'Voice Acting'],
    languages: ['Hindi', 'English', 'Marathi'], preferredLanguage: ['Hindi', 'English'],
    qualification: 'Bachelor of Performing Arts', institute: 'Mumbai School of Drama',
    occupation: 'Actor', availableFor: ['Films', 'Web Series', 'Advertisements'], union: 'No', relocate: 'Yes',
    height: 180, weight: 76, bodyType: 'Athletic', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Lead', 'Drama', 'Action'], travelAvailability: 'Across India', nightShoots: 'Yes',
    profilePhoto: portraitUrls[0], headshot: portraitUrls[0], fullBody: portraitUrls[1], introVideo: sampleVideoUrl,
    previousWork: ['Monsoon Letters', 'City Lights'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', imdb: 'https://imdb.com/', website: 'https://example.com/arjun',
    resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Best New Performer, 2024', bio: 'Mumbai-based screen actor drawn to grounded stories and complex characters.', trkCode: 'TRK261001',
  },
  {
    username: 'mira_kapoor', email: 'mira.kapoor@example.com', mobile: '+919876540002',
    fullName: 'Mira Kapoor', stageName: 'Mira K.', age: 25, gender: 'Female',
    country: 'India', state: 'Delhi', city: 'New Delhi', role: 'artist', category: 'Model',
    experience: '3-5 Years', skills: ['Editorial', 'Runway', 'Commercial Modeling'],
    languages: ['Hindi', 'English', 'Punjabi'], preferredLanguage: ['Hindi', 'English'],
    qualification: 'Fashion Communication', institute: 'National Institute of Fashion Technology',
    occupation: 'Model', availableFor: ['Editorial', 'Fashion', 'Advertisements'], union: 'No', relocate: 'Yes',
    height: 174, weight: 56, bodyType: 'Slim', skinTone: 'Fair', hairColor: 'Brown', eyeColor: 'Brown',
    preferredRole: ['Editorial', 'Beauty', 'Lifestyle'], travelAvailability: 'Worldwide', nightShoots: 'Yes',
    profilePhoto: portraitUrls[1], headshot: portraitUrls[1], fullBody: portraitUrls[2], introVideo: sampleVideoUrl,
    previousWork: ['Indigo Studio', 'Spring Lookbook'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/mira', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Emerging Face, 2025', bio: 'Delhi model working across fashion editorials, beauty and lifestyle campaigns.', trkCode: 'TRK261002',
  },
  {
    username: 'kabir_rao', email: 'kabir.rao@example.com', mobile: '+919876540003',
    fullName: 'Kabir Rao', stageName: 'K-Rao', age: 27, gender: 'Male',
    country: 'India', state: 'Karnataka', city: 'Bengaluru', role: 'artist', category: 'Dancer',
    experience: '5-7 Years', skills: ['Contemporary', 'Hip-Hop', 'Choreography'],
    languages: ['Kannada', 'Hindi', 'English'], preferredLanguage: ['Hindi', 'English'],
    qualification: 'Diploma in Dance', institute: 'Attakkalari Centre for Movement Arts',
    occupation: 'Dancer and Choreographer', availableFor: ['Films', 'Music Videos', 'Live Shows'], union: 'No', relocate: 'Yes',
    height: 176, weight: 70, bodyType: 'Athletic', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Dancer', 'Choreographer', 'Performer'], travelAvailability: 'Worldwide', nightShoots: 'Yes',
    profilePhoto: portraitUrls[2], headshot: portraitUrls[2], fullBody: portraitUrls[3], introVideo: sampleVideoUrl,
    previousWork: ['Pulse Tour', 'Neon Rain'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/kabir', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Urban Dance Finalist, 2023', bio: 'Bengaluru performer blending contemporary movement with street styles.', trkCode: 'TRK261003',
  },
  {
    username: 'sana_iyer', email: 'sana.iyer@example.com', mobile: '+919876540004',
    fullName: 'Sana Iyer', stageName: 'Sana I.', age: 24, gender: 'Female',
    country: 'India', state: 'Tamil Nadu', city: 'Chennai', role: 'artist', category: 'Actor',
    experience: '1-3 Years', skills: ['Theatre', 'Classical Dance', 'Tamil Cinema'],
    languages: ['Tamil', 'English', 'Hindi'], preferredLanguage: ['Tamil', 'English'],
    qualification: 'Bachelor of Fine Arts', institute: 'University of Madras',
    occupation: 'Actor', availableFor: ['Films', 'Television', 'Theatre'], union: 'No', relocate: 'Yes',
    height: 166, weight: 54, bodyType: 'Petite', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Drama', 'Romance', 'Theatre'], travelAvailability: 'South India', nightShoots: 'Yes',
    profilePhoto: portraitUrls[3], headshot: portraitUrls[3], fullBody: portraitUrls[4], introVideo: sampleVideoUrl,
    previousWork: ['The Blue Courtyard', 'Nila'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/sana', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Campus Theatre Award, 2024', bio: 'Chennai actor with a theatre background and a love for character-led drama.', trkCode: 'TRK261004',
  },
  {
    username: 'rohan_das', email: 'rohan.das@example.com', mobile: '+919876540005',
    fullName: 'Rohan Das', stageName: 'Rohan D.', age: 31, gender: 'Male',
    country: 'India', state: 'West Bengal', city: 'Kolkata', role: 'artist', category: 'Voice Artist',
    experience: '7-10 Years', skills: ['Voiceover', 'Bengali Theatre', 'Audio Drama'],
    languages: ['Bengali', 'Hindi', 'English'], preferredLanguage: ['Bengali', 'Hindi'],
    qualification: 'Mass Communication', institute: 'Jadavpur University',
    occupation: 'Voice Artist', availableFor: ['Animation', 'Audio Books', 'Advertisements'], union: 'No', relocate: 'No',
    height: 178, weight: 75, bodyType: 'Average', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Narration', 'Character Voice', 'Radio'], travelAvailability: 'Remote', nightShoots: 'No',
    profilePhoto: portraitUrls[4], headshot: portraitUrls[4], fullBody: portraitUrls[5], introVideo: sampleVideoUrl,
    previousWork: ['River Tales', 'Aakash Radio'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/rohan', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Regional Audio Award, 2022', bio: 'Kolkata voice artist bringing warmth and range to narration and character work.', trkCode: 'TRK261005',
  },
  {
    username: 'aisha_khan', email: 'aisha.khan@example.com', mobile: '+919876540006',
    fullName: 'Aisha Khan', stageName: 'Aisha K.', age: 26, gender: 'Female',
    country: 'India', state: 'Telangana', city: 'Hyderabad', role: 'artist', category: 'Actor',
    experience: '3-5 Years', skills: ['Screen Acting', 'Odissi', 'Script Reading'],
    languages: ['Urdu', 'Hindi', 'English'], preferredLanguage: ['Hindi', 'Urdu'],
    qualification: 'Bachelor of Performing Arts', institute: 'University of Hyderabad',
    occupation: 'Actor', availableFor: ['Films', 'Web Series', 'Advertisements'], union: 'No', relocate: 'Yes',
    height: 169, weight: 58, bodyType: 'Athletic', skinTone: 'Olive', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Drama', 'Thriller', 'Period'], travelAvailability: 'Across India', nightShoots: 'Yes',
    profilePhoto: portraitUrls[5], headshot: portraitUrls[5], fullBody: portraitUrls[6], introVideo: sampleVideoUrl,
    previousWork: ['Paper Moons', 'The Last Postcard'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/aisha', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Best Ensemble, 2025', bio: 'Hyderabad-based actor interested in emotionally rich roles and independent cinema.', trkCode: 'TRK261006',
  },
  {
    username: 'dev_malhotra', email: 'dev.malhotra@example.com', mobile: '+919876540007',
    fullName: 'Dev Malhotra', stageName: 'Dev M.', age: 29, gender: 'Male',
    country: 'India', state: 'Punjab', city: 'Chandigarh', role: 'artist', category: 'Model',
    experience: '5-7 Years', skills: ['Commercial Modeling', 'Fitness', 'Acting'],
    languages: ['Punjabi', 'Hindi', 'English'], preferredLanguage: ['Hindi', 'Punjabi'],
    qualification: 'Sports Science', institute: 'Panjab University',
    occupation: 'Model and Actor', availableFor: ['Fashion', 'Fitness', 'Advertisements'], union: 'No', relocate: 'Yes',
    height: 184, weight: 80, bodyType: 'Athletic', skinTone: 'Fair', hairColor: 'Black', eyeColor: 'Hazel',
    preferredRole: ['Commercial', 'Action', 'Sports'], travelAvailability: 'Worldwide', nightShoots: 'Yes',
    profilePhoto: portraitUrls[6], headshot: portraitUrls[6], fullBody: portraitUrls[7], introVideo: sampleVideoUrl,
    previousWork: ['Northline Active', 'Open Road'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/dev', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Fitness Campaign Pick, 2024', bio: 'Chandigarh model and actor with a focus on commercial and activewear work.', trkCode: 'TRK261007',
  },
  {
    username: 'naina_bose', email: 'naina.bose@example.com', mobile: '+919876540008',
    fullName: 'Naina Bose', stageName: 'Naina B.', age: 23, gender: 'Female',
    country: 'India', state: 'West Bengal', city: 'Kolkata', role: 'artist', category: 'Dancer',
    experience: '3-5 Years', skills: ['Kathak', 'Contemporary', 'Movement Direction'],
    languages: ['Bengali', 'Hindi', 'English'], preferredLanguage: ['Bengali', 'Hindi'],
    qualification: 'Diploma in Kathak', institute: 'Rabindra Bharati University',
    occupation: 'Dancer', availableFor: ['Films', 'Music Videos', 'Live Shows'], union: 'No', relocate: 'Yes',
    height: 164, weight: 52, bodyType: 'Slim', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown',
    preferredRole: ['Classical', 'Contemporary', 'Ensemble'], travelAvailability: 'Worldwide', nightShoots: 'Yes',
    profilePhoto: portraitUrls[7], headshot: portraitUrls[7], fullBody: portraitUrls[8], introVideo: sampleVideoUrl,
    previousWork: ['Rain Room', 'Kolkata Spring Showcase'], instagram: 'https://instagram.com/',
    youtube: 'https://youtube.com/', website: 'https://example.com/naina', resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Young Performer Citation, 2023', bio: 'Kolkata dancer combining classical training with contemporary movement.', trkCode: 'TRK261008',
  },
  {
    username: 'ishaan_roy', email: 'ishaan.roy@example.com', mobile: '+919876540009',
    fullName: 'Ishaan Roy', stageName: 'Ishaan Roy', age: 38, gender: 'Male',
    country: 'India', state: 'Maharashtra', city: 'Mumbai', role: 'audience', category: 'Casting Director',
    experience: '10+ Years', skills: ['Casting', 'Talent Development', 'Production'],
    languages: ['Hindi', 'English', 'Bengali'], preferredLanguage: ['Hindi', 'English'],
    qualification: 'Film Direction', institute: 'Whistling Woods International', occupation: 'Casting Director',
    availableFor: ['Feature Films', 'Web Series'], union: 'No', relocate: 'No', height: 177, weight: 74,
    bodyType: 'Average', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown', preferredRole: ['Casting'],
    travelAvailability: 'Across India', nightShoots: 'Yes', profilePhoto: portraitUrls[8], headshot: portraitUrls[8],
    fullBody: portraitUrls[9], introVideo: sampleVideoUrl, previousWork: ['The Long Weekend', 'Glass Harbour'],
    instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', website: 'https://example.com/ishaan',
    resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Independent Film Guild Nominee', bio: 'Mumbai casting director building thoughtful, inclusive ensembles.', trkCode: 'TRK261009',
  },
  {
    username: 'tara_menon', email: 'tara.menon@example.com', mobile: '+919876540010',
    fullName: 'Tara Menon', stageName: 'Tara Menon', age: 35, gender: 'Female',
    country: 'India', state: 'Kerala', city: 'Kochi', role: 'audience', category: 'Producer',
    experience: '7-10 Years', skills: ['Film Production', 'Creative Development', 'Scheduling'],
    languages: ['Malayalam', 'English', 'Hindi'], preferredLanguage: ['Malayalam', 'English'],
    qualification: 'Media Studies', institute: 'Symbiosis Institute of Media and Communication', occupation: 'Producer',
    availableFor: ['Films', 'Documentaries'], union: 'No', relocate: 'Yes', height: 168, weight: 60,
    bodyType: 'Average', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown', preferredRole: ['Production'],
    travelAvailability: 'South Asia', nightShoots: 'Yes', profilePhoto: portraitUrls[9], headshot: portraitUrls[9],
    fullBody: portraitUrls[10], introVideo: sampleVideoUrl, previousWork: ['Salt Water', 'A Small Place to Begin'],
    instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', website: 'https://example.com/tara',
    resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Coastal Stories Grant, 2024', bio: 'Kochi producer developing human-scale features and documentary projects.', trkCode: 'TRK261010',
  },
  {
    username: 'vikram_shah', email: 'vikram.shah@example.com', mobile: '+919876540011',
    fullName: 'Vikram Shah', stageName: 'Vikram Shah', age: 42, gender: 'Male',
    country: 'India', state: 'Gujarat', city: 'Ahmedabad', role: 'audience', category: 'Producer',
    experience: '10+ Years', skills: ['Advertising', 'Production', 'Brand Films'],
    languages: ['Gujarati', 'Hindi', 'English'], preferredLanguage: ['Gujarati', 'Hindi'],
    qualification: 'Business Administration', institute: 'Gujarat University', occupation: 'Producer',
    availableFor: ['Advertisements', 'Brand Films', 'Television'], union: 'No', relocate: 'Yes', height: 181, weight: 82,
    bodyType: 'Average', skinTone: 'Medium', hairColor: 'Black', eyeColor: 'Brown', preferredRole: ['Production'],
    travelAvailability: 'India', nightShoots: 'Yes', profilePhoto: portraitUrls[10], headshot: portraitUrls[10],
    fullBody: portraitUrls[11], introVideo: sampleVideoUrl, previousWork: ['Bright Days Campaign', 'The Old Station'],
    instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', website: 'https://example.com/vikram',
    resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Regional Brand Film Award, 2023', bio: 'Ahmedabad producer connecting local stories with national campaigns.', trkCode: 'TRK261011',
  },
  {
    username: 'leela_fernandes', email: 'leela.fernandes@example.com', mobile: '+919876540012',
    fullName: 'Leela Fernandes', stageName: 'Leela Fernandes', age: 33, gender: 'Female',
    country: 'India', state: 'Goa', city: 'Panaji', role: 'audience', category: 'Casting Coordinator',
    experience: '5-7 Years', skills: ['Auditions', 'Talent Coordination', 'Set Management'],
    languages: ['Konkani', 'English', 'Hindi'], preferredLanguage: ['English', 'Hindi'],
    qualification: 'Theatre and Performance', institute: 'Goa University', occupation: 'Casting Coordinator',
    availableFor: ['Films', 'Advertisements', 'Short Films'], union: 'No', relocate: 'Yes', height: 165, weight: 57,
    bodyType: 'Average', skinTone: 'Olive', hairColor: 'Brown', eyeColor: 'Brown', preferredRole: ['Casting'],
    travelAvailability: 'West India', nightShoots: 'Yes', profilePhoto: portraitUrls[11], headshot: portraitUrls[11],
    fullBody: portraitUrls[0], introVideo: sampleVideoUrl, previousWork: ['Blue Veranda', 'Island Stories'],
    instagram: 'https://instagram.com/', youtube: 'https://youtube.com/', website: 'https://example.com/leela',
    resume: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    awards: 'Goa Short Film Showcase, 2025', bio: 'Panaji casting coordinator who makes first-time performers feel at home.', trkCode: 'TRK261012',
  },
];

const auditionData: Array<Omit<typeof schema.auditions.$inferInsert, 'creatorId'>> = [
  {
    title: 'Monsoon Letters', category: 'Film', role: 'Lead actor, 25-35', location: 'Mumbai',
    pay: 'Paid, ₹18,000/day', deadline: '2026-12-20', lang: 'Hindi, English',
    desc: 'Seeking a grounded performer for an intimate feature about two siblings returning home during monsoon season.',
  },
  {
    title: 'New Faces: Spring Campaign', category: 'Ad', role: 'Fashion and lifestyle models, 20-30', location: 'Delhi',
    pay: 'Paid, ₹45,000 project fee', deadline: '2026-12-15', lang: 'Hindi, English',
    desc: 'A lifestyle campaign for an Indian design label. Please include recent headshots and a full-length portfolio image.',
  },
  {
    title: 'Pulse on the Roof', category: 'Dancer', role: 'Four contemporary dancers, 22-32', location: 'Bengaluru',
    pay: 'Paid, ₹12,000/day', deadline: '2026-12-10', lang: 'Any',
    desc: 'Auditioning versatile dancers for a rooftop performance film. Contemporary and street styles are welcome.',
  },
  {
    title: 'The Blue Courtyard', category: 'TV', role: 'Supporting actor, 30-45', location: 'Chennai',
    pay: 'Paid, ₹15,000/day', deadline: '2026-12-28', lang: 'Tamil',
    desc: 'Looking for an expressive supporting actor for a family drama pilot. Theatre experience is a plus.',
  },
  {
    title: 'River Tales: Voice Edition', category: 'Film', role: 'Bengali and Hindi voice artists, 25-50', location: 'Remote',
    pay: 'Paid, ₹8,000/session', deadline: '2026-12-18', lang: 'Bengali, Hindi',
    desc: 'Warm, clear voices needed for an animated short anthology. Home recording setup preferred.',
  },
  {
    title: 'Paper Moons', category: 'Film', role: 'Lead actor, 22-30', location: 'Hyderabad',
    pay: 'Paid, ₹16,000/day', deadline: '2027-01-05', lang: 'Hindi, Urdu',
    desc: 'An independent drama seeking a nuanced lead performer. Audition sides and self-tape instructions are provided after applying.',
  },
  {
    title: 'Northline Active', category: 'Ad', role: 'Athletic male model, 25-35', location: 'Chandigarh',
    pay: 'Paid, ₹35,000 project fee', deadline: '2026-12-22', lang: 'Hindi, Punjabi',
    desc: 'Sportswear campaign casting for an energetic, natural on-camera presence. Previous fitness work is welcome.',
  },
  {
    title: 'Rain Room', category: 'Dancer', role: 'Kathak and contemporary dancers, 20-30', location: 'Kolkata',
    pay: 'Paid, ₹10,000/day', deadline: '2027-01-12', lang: 'Bengali, Hindi, English',
    desc: 'Movement-led short film looking for trained dancers comfortable blending classical and contemporary forms.',
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database.');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db.transaction(async (tx) => {
      await tx.delete(schema.commentLikes);
      await tx.delete(schema.videoLikes);
      await tx.delete(schema.comments);
      await tx.delete(schema.storyViews);
      await tx.delete(schema.messages);
      await tx.delete(schema.chatParticipants);
      await tx.delete(schema.chats);
      await tx.delete(schema.applications);
      await tx.delete(schema.auditions);
      await tx.delete(schema.stories);
      await tx.delete(schema.videos);
      await tx.delete(schema.notifications);
      await tx.delete(schema.activityLogs);
      await tx.delete(schema.follows);
      await tx.delete(schema.users);

      const members = await tx.insert(schema.users).values(
        profileData.map((profile) => ({ ...profile, password: hashedPassword })),
      ).returning();

      const storyRows = await tx.insert(schema.stories).values(
        members.map((member, index) => ({
          creatorId: member.id,
          mediaUrl: index % 4 === 0 ? sampleVideoUrl : member.profilePhoto!,
          mediaType: index % 4 === 0 ? 'video' : 'image',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })),
      ).returning();

      await tx.insert(schema.storyViews).values(
        storyRows.map((story, index) => ({
          storyId: story.id,
          viewerId: members[(index + 1) % members.length].id,
        })),
      );

      const postValues: Array<typeof schema.videos.$inferInsert> = [];
      members.forEach((member, index) => {
        postValues.push({
          creatorId: member.id,
          category: 'Photos',
          title: ['On set today', 'Portfolio update', 'A frame from the week'][index % 3],
          desc: `${member.fullName} shares a recent portfolio moment from ${member.city}.`,
          url: member.profilePhoto!,
          thumb: member.profilePhoto!,
          viewsCount: 48 + index * 19,
          likesCount: 2,
        });

        if (index < 8) {
          postValues.push({
            creatorId: member.id,
            category: ['Films', 'Ads', 'TV', 'Music Videos'][index % 4],
            title: [
              'Monologue: The quiet decision', 'Movement study in blue', 'A day in the studio',
              'The last train home', 'Character voice reel', 'Two minutes before dawn',
              'Northline campaign test', 'Rain room rehearsal',
            ][index],
            desc: `${member.fullName} shares a short performance reel.`,
            url: sampleVideoUrl,
            thumb: member.profilePhoto!,
            viewsCount: 125 + index * 37,
            likesCount: 2,
          });
        }
      });

      const posts = await tx.insert(schema.videos).values(postValues).returning();
      await tx.insert(schema.videoLikes).values(
        posts.flatMap((post) => members
          .filter((member) => member.id !== post.creatorId)
          .slice(0, 2)
          .map((member) => ({ videoId: post.id, userId: member.id }))),
      );

      const comments = await tx.insert(schema.comments).values(
        posts.map((post, index) => {
          const commenter = members.find((member) => member.id !== post.creatorId)!;
          return {
            videoId: post.id,
            userId: commenter.id,
            text: [
              'Beautiful frame. The light is perfect.',
              'Such a natural performance!',
              'Would love to see the full project.',
              'This has a lovely sense of place.',
            ][index % 4],
            likesCount: 1,
          };
        }),
      ).returning();
      await tx.insert(schema.commentLikes).values(
        comments.map((comment) => ({
          commentId: comment.id,
          userId: members.find((member) => member.id !== comment.userId)!.id,
        })),
      );

      const auditions = await tx.insert(schema.auditions).values(
        auditionData.map((audition, index) => ({
          ...audition,
          creatorId: members[8 + (index % 4)].id,
        })),
      ).returning();

      const applications = await tx.insert(schema.applications).values(
        auditions.flatMap((audition, index) => [0, 1].map((applicantOffset) => ({
          auditionId: audition.id,
          applicantId: members[(index * 2 + applicantOffset) % 8].id,
          coverLetter: `I am interested in ${audition.title} and believe my ${members[(index * 2 + applicantOffset) % 8].category} experience is a strong fit.`,
          status: ['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'][(index + applicantOffset) % 4],
          details: applicantOffset === 0 ? 'Please share your latest self-tape.' : 'Application received by the casting team.',
        }))),
      ).returning();

      await tx.insert(schema.follows).values(
        members.flatMap((member, index) => [1, 2, 3].map((offset) => ({
          followerId: member.id,
          followingId: members[(index + offset) % members.length].id,
        }))),
      );

      const chatPairs = Array.from({ length: 6 }, (_, index) => [members[index], members[index + 6]]);
      const chats = await tx.insert(schema.chats).values(chatPairs.map(() => ({}))).returning();
      await tx.insert(schema.chatParticipants).values(
        chats.flatMap((chat, index) => chatPairs[index].map((member) => ({
          chatId: chat.id,
          userId: member.id,
        }))),
      );
      await tx.insert(schema.messages).values(
        chats.flatMap((chat, index) => [
          { chatId: chat.id, senderId: chatPairs[index][0].id, text: 'Hi! I saw your recent work and wanted to connect.' },
          { chatId: chat.id, senderId: chatPairs[index][1].id, text: 'Thanks for reaching out. Happy to share more details.' },
        ]),
      );

      await tx.insert(schema.notifications).values(
        members.map((member, index) => ({
          userId: member.id,
          title: index % 2 === 0 ? 'Welcome to Casting' : 'Your profile is ready to explore',
          text: index % 2 === 0
            ? 'Discover new auditions, meet collaborators and share your work.'
            : 'Add your latest portfolio work and follow creators in your community.',
        })),
      );

      await tx.insert(schema.activityLogs).values([
        ...members.map((member) => ({ userId: member.id, action: 'REGISTER', entity: 'user', entityId: member.id, details: { source: 'demo_seed' } })),
        ...auditions.map((audition) => ({ userId: audition.creatorId, action: 'AUDITION_CREATE', entity: 'audition', entityId: audition.id, details: { title: audition.title } })),
        ...applications.map((application) => ({ userId: application.applicantId, action: 'APPLICATION_SUBMIT', entity: 'application', entityId: application.id, details: { auditionId: application.auditionId } })),
      ]);
    });

    console.log('Seed completed: 12 members, 12 stories, photo and video posts, auditions, applications, follows, likes, comments, chats, notifications and activity logs.');
    console.log('Demo login: seeduser@example.com / password123');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unable to start seed:', error);
  process.exitCode = 1;
});
