import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

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
const sampleResumeUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const profileData: Array<Omit<typeof schema.users.$inferInsert, 'password'>> = [
  {
    username: 'arjun_mehta',
    email: 'seeduser@example.com',
    mobile: '+919876540001',
    fullName: 'Arjun Mehta',
    stageName: 'Arjun M.',
    dob: '1998-04-12',
    age: 28,
    gender: 'Male',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    address: '402, Sea View Apartments, Bandra West',
    postalCode: '400050',
    role: 'artist',
    category: 'Acting',
    experience: '5-7 Years',
    skills: ['Screen Acting', 'Improvisation', 'Voice Acting'],
    languages: ['Hindi', 'English', 'Marathi'],
    preferredLanguage: ['Hindi', 'English'],
    qualification: 'Bachelor of Performing Arts',
    institute: 'Mumbai School of Drama',
    occupation: 'Actor',
    availableFor: ['Films', 'Web Series', 'Advertisements'],
    union: 'No',
    relocate: 'Yes',
    height: 180,
    weight: 76,
    bodyType: 'Athletic',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Lead', 'Drama', 'Action'],
    travelAvailability: 'Across India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[0],
    headshot: portraitUrls[0],
    fullBody: portraitUrls[1],
    introVideo: sampleVideoUrl,
    previousWork: ['Monsoon Letters', 'City Lights'],
    instagram: 'https://instagram.com/arjun_acting',
    youtube: 'https://youtube.com/@arjunmehta',
    facebookUrl: 'https://facebook.com/arjun.mehta.actor',
    imdb: 'https://imdb.com/name/nm9876001',
    website: 'https://example.com/arjun',
    resume: sampleResumeUrl,
    awards: 'Best New Performer, 2024',
    bio: 'Mumbai-based screen actor drawn to grounded stories and complex characters.',
    trkCode: 'TRK261001',
    emailVerified: true,
  },
  {
    username: 'mira_kapoor',
    email: 'mira.kapoor@example.com',
    mobile: '+919876540002',
    fullName: 'Mira Kapoor',
    stageName: 'Mira K.',
    dob: '2001-08-19',
    age: 25,
    gender: 'Female',
    country: 'India',
    state: 'Delhi',
    city: 'New Delhi',
    address: 'B-14, Hauz Khas Enclave',
    postalCode: '110016',
    role: 'artist',
    category: 'Costumes',
    experience: '3-5 Years',
    skills: ['Editorial', 'Runway', 'Commercial Styling', 'Wardrobe Design'],
    languages: ['Hindi', 'English', 'Punjabi'],
    preferredLanguage: ['Hindi', 'English'],
    qualification: 'Fashion Communication',
    institute: 'National Institute of Fashion Technology',
    occupation: 'Costume Designer & Model',
    availableFor: ['Editorial', 'Fashion', 'Advertisements'],
    union: 'No',
    relocate: 'Yes',
    height: 174,
    weight: 56,
    bodyType: 'Slim',
    skinTone: 'Fair',
    hairColor: 'Brown',
    eyeColor: 'Brown',
    preferredRole: ['Editorial', 'Beauty', 'Lifestyle'],
    travelAvailability: 'Worldwide',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[1],
    headshot: portraitUrls[1],
    fullBody: portraitUrls[2],
    introVideo: sampleVideoUrl,
    previousWork: ['Indigo Studio', 'Spring Lookbook'],
    instagram: 'https://instagram.com/mirakapoor',
    youtube: 'https://youtube.com/@mirakapoor',
    facebookUrl: 'https://facebook.com/mira.kapoor.official',
    imdb: 'https://imdb.com/name/nm9876002',
    website: 'https://example.com/mira',
    resume: sampleResumeUrl,
    awards: 'Emerging Face, 2025',
    bio: 'Delhi artist working across fashion editorials, costumes, beauty and lifestyle campaigns.',
    trkCode: 'TRK261002',
    emailVerified: true,
  },
  {
    username: 'kabir_rao',
    email: 'kabir.rao@example.com',
    mobile: '+919876540003',
    fullName: 'Kabir Rao',
    stageName: 'K-Rao',
    dob: '1999-11-03',
    age: 27,
    gender: 'Male',
    country: 'India',
    state: 'Karnataka',
    city: 'Bengaluru',
    address: '88, 12th Main, Indiranagar',
    postalCode: '560038',
    role: 'artist',
    category: 'Dancing',
    experience: '5-7 Years',
    skills: ['Contemporary', 'Hip-Hop', 'Choreography', 'Acrobatics'],
    languages: ['Kannada', 'Hindi', 'English'],
    preferredLanguage: ['Hindi', 'English'],
    qualification: 'Diploma in Dance',
    institute: 'Attakkalari Centre for Movement Arts',
    occupation: 'Dancer and Choreographer',
    availableFor: ['Films', 'Music Videos', 'Live Shows'],
    union: 'No',
    relocate: 'Yes',
    height: 176,
    weight: 70,
    bodyType: 'Athletic',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Dancer', 'Choreographer', 'Performer'],
    travelAvailability: 'Worldwide',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[2],
    headshot: portraitUrls[2],
    fullBody: portraitUrls[3],
    introVideo: sampleVideoUrl,
    previousWork: ['Pulse Tour', 'Neon Rain'],
    instagram: 'https://instagram.com/k_rao_dance',
    youtube: 'https://youtube.com/@kabirraodance',
    facebookUrl: 'https://facebook.com/kabir.rao.dance',
    imdb: 'https://imdb.com/name/nm9876003',
    website: 'https://example.com/kabir',
    resume: sampleResumeUrl,
    awards: 'Urban Dance Finalist, 2023',
    bio: 'Bengaluru performer blending contemporary movement with street styles.',
    trkCode: 'TRK261003',
    emailVerified: true,
  },
  {
    username: 'sana_iyer',
    email: 'sana.iyer@example.com',
    mobile: '+919876540004',
    fullName: 'Sana Iyer',
    stageName: 'Sana I.',
    dob: '2002-02-14',
    age: 24,
    gender: 'Female',
    country: 'India',
    state: 'Tamil Nadu',
    city: 'Chennai',
    address: '22, Boat Club Road, R.A. Puram',
    postalCode: '600028',
    role: 'artist',
    category: 'Acting',
    experience: '1-3 Years',
    skills: ['Theatre', 'Classical Dance', 'Tamil Cinema', 'Dubbing'],
    languages: ['Tamil', 'English', 'Hindi'],
    preferredLanguage: ['Tamil', 'English'],
    qualification: 'Bachelor of Fine Arts',
    institute: 'University of Madras',
    occupation: 'Actor',
    availableFor: ['Films', 'Television', 'Theatre'],
    union: 'No',
    relocate: 'Yes',
    height: 166,
    weight: 54,
    bodyType: 'Petite',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Drama', 'Romance', 'Theatre'],
    travelAvailability: 'South India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[3],
    headshot: portraitUrls[3],
    fullBody: portraitUrls[4],
    introVideo: sampleVideoUrl,
    previousWork: ['The Blue Courtyard', 'Nila'],
    instagram: 'https://instagram.com/sana_iyer',
    youtube: 'https://youtube.com/@sanaiyer',
    facebookUrl: 'https://facebook.com/sana.iyer.official',
    imdb: 'https://imdb.com/name/nm9876004',
    website: 'https://example.com/sana',
    resume: sampleResumeUrl,
    awards: 'Campus Theatre Award, 2024',
    bio: 'Chennai actor with a theatre background and a love for character-led drama.',
    trkCode: 'TRK261004',
    emailVerified: true,
  },
  {
    username: 'rohan_das',
    email: 'rohan.das@example.com',
    mobile: '+919876540005',
    fullName: 'Rohan Das',
    stageName: 'Rohan D.',
    dob: '1995-09-08',
    age: 31,
    gender: 'Male',
    country: 'India',
    state: 'West Bengal',
    city: 'Kolkata',
    address: '7B, Southern Avenue',
    postalCode: '700029',
    role: 'artist',
    category: 'Audiography',
    experience: '7-10 Years',
    skills: ['Voiceover', 'Audio Mixing', 'Foley', 'Bengali Theatre'],
    languages: ['Bengali', 'Hindi', 'English'],
    preferredLanguage: ['Bengali', 'Hindi'],
    qualification: 'Mass Communication',
    institute: 'Jadavpur University',
    occupation: 'Sound Designer & Voice Artist',
    availableFor: ['Animation', 'Audio Books', 'Advertisements', 'Films'],
    union: 'No',
    relocate: 'No',
    height: 178,
    weight: 75,
    bodyType: 'Average',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Narration', 'Character Voice', 'Radio', 'Sound Design'],
    travelAvailability: 'Remote',
    nightShoots: 'No',
    profilePhoto: portraitUrls[4],
    headshot: portraitUrls[4],
    fullBody: portraitUrls[5],
    introVideo: sampleVideoUrl,
    previousWork: ['River Tales', 'Aakash Radio'],
    instagram: 'https://instagram.com/rohan_sound',
    youtube: 'https://youtube.com/@rohandasaudio',
    facebookUrl: 'https://facebook.com/rohan.das.voice',
    imdb: 'https://imdb.com/name/nm9876005',
    website: 'https://example.com/rohan',
    resume: sampleResumeUrl,
    awards: 'Regional Audio Award, 2022',
    bio: 'Kolkata voice and audio artist bringing warmth and range to soundscapes and character work.',
    trkCode: 'TRK261005',
    emailVerified: true,
  },
  {
    username: 'aisha_khan',
    email: 'aisha.khan@example.com',
    mobile: '+919876540006',
    fullName: 'Aisha Khan',
    stageName: 'Aisha K.',
    dob: '2000-06-25',
    age: 26,
    gender: 'Female',
    country: 'India',
    state: 'Telangana',
    city: 'Hyderabad',
    address: 'Plot 45, Jubilee Hills Check Post',
    postalCode: '500033',
    role: 'artist',
    category: 'Acting',
    experience: '3-5 Years',
    skills: ['Screen Acting', 'Odissi', 'Script Reading', 'Urdu Diction'],
    languages: ['Urdu', 'Hindi', 'English'],
    preferredLanguage: ['Hindi', 'Urdu'],
    qualification: 'Bachelor of Performing Arts',
    institute: 'University of Hyderabad',
    occupation: 'Actor',
    availableFor: ['Films', 'Web Series', 'Advertisements'],
    union: 'No',
    relocate: 'Yes',
    height: 169,
    weight: 58,
    bodyType: 'Athletic',
    skinTone: 'Olive',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Drama', 'Thriller', 'Period'],
    travelAvailability: 'Across India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[5],
    headshot: portraitUrls[5],
    fullBody: portraitUrls[6],
    introVideo: sampleVideoUrl,
    previousWork: ['Paper Moons', 'The Last Postcard'],
    instagram: 'https://instagram.com/aishakhan_act',
    youtube: 'https://youtube.com/@aishakhan',
    facebookUrl: 'https://facebook.com/aisha.khan.screen',
    imdb: 'https://imdb.com/name/nm9876006',
    website: 'https://example.com/aisha',
    resume: sampleResumeUrl,
    awards: 'Best Ensemble, 2025',
    bio: 'Hyderabad-based actor interested in emotionally rich roles and independent cinema.',
    trkCode: 'TRK261006',
    emailVerified: true,
  },
  {
    username: 'dev_malhotra',
    email: 'dev.malhotra@example.com',
    mobile: '+919876540007',
    fullName: 'Dev Malhotra',
    stageName: 'Dev M.',
    dob: '1997-01-30',
    age: 29,
    gender: 'Male',
    country: 'India',
    state: 'Punjab',
    city: 'Chandigarh',
    address: 'House 112, Sector 8-C',
    postalCode: '160018',
    role: 'artist',
    category: 'Stunts',
    experience: '5-7 Years',
    skills: ['Stunt Action', 'Martial Arts', 'Wire Work', 'Fitness Modeling'],
    languages: ['Punjabi', 'Hindi', 'English'],
    preferredLanguage: ['Hindi', 'Punjabi'],
    qualification: 'Sports Science',
    institute: 'Panjab University',
    occupation: 'Stunt Performer & Actor',
    availableFor: ['Fashion', 'Fitness', 'Advertisements', 'Action Films'],
    union: 'No',
    relocate: 'Yes',
    height: 184,
    weight: 80,
    bodyType: 'Athletic',
    skinTone: 'Fair',
    hairColor: 'Black',
    eyeColor: 'Hazel',
    preferredRole: ['Action', 'Commercial', 'Sports'],
    travelAvailability: 'Worldwide',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[6],
    headshot: portraitUrls[6],
    fullBody: portraitUrls[7],
    introVideo: sampleVideoUrl,
    previousWork: ['Northline Active', 'Open Road'],
    instagram: 'https://instagram.com/dev_action',
    youtube: 'https://youtube.com/@devmalhotrastunts',
    facebookUrl: 'https://facebook.com/dev.malhotra.stunts',
    imdb: 'https://imdb.com/name/nm9876007',
    website: 'https://example.com/dev',
    resume: sampleResumeUrl,
    awards: 'Fitness Campaign Pick, 2024',
    bio: 'Chandigarh stunt performer and action artist with a focus on high-octane physical roles.',
    trkCode: 'TRK261007',
    emailVerified: true,
  },
  {
    username: 'naina_bose',
    email: 'naina.bose@example.com',
    mobile: '+919876540008',
    fullName: 'Naina Bose',
    stageName: 'Naina B.',
    dob: '2003-12-10',
    age: 23,
    gender: 'Female',
    country: 'India',
    state: 'West Bengal',
    city: 'Kolkata',
    address: '15, Ballygunge Circular Road',
    postalCode: '700019',
    role: 'artist',
    category: 'Dancing',
    experience: '3-5 Years',
    skills: ['Kathak', 'Contemporary', 'Movement Direction', 'Choreography'],
    languages: ['Bengali', 'Hindi', 'English'],
    preferredLanguage: ['Bengali', 'Hindi'],
    qualification: 'Diploma in Kathak',
    institute: 'Rabindra Bharati University',
    occupation: 'Dancer & Choreographer',
    availableFor: ['Films', 'Music Videos', 'Live Shows'],
    union: 'No',
    relocate: 'Yes',
    height: 164,
    weight: 52,
    bodyType: 'Slim',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Classical', 'Contemporary', 'Ensemble'],
    travelAvailability: 'Worldwide',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[7],
    headshot: portraitUrls[7],
    fullBody: portraitUrls[8],
    introVideo: sampleVideoUrl,
    previousWork: ['Rain Room', 'Kolkata Spring Showcase'],
    instagram: 'https://instagram.com/naina_kathak',
    youtube: 'https://youtube.com/@nainabosedance',
    facebookUrl: 'https://facebook.com/naina.bose.dance',
    imdb: 'https://imdb.com/name/nm9876008',
    website: 'https://example.com/naina',
    resume: sampleResumeUrl,
    awards: 'Young Performer Citation, 2023',
    bio: 'Kolkata dancer combining classical training with contemporary movement.',
    trkCode: 'TRK261008',
    emailVerified: true,
  },
  {
    username: 'ishaan_roy',
    email: 'ishaan.roy@example.com',
    mobile: '+919876540009',
    fullName: 'Ishaan Roy',
    stageName: 'Ishaan Roy',
    dob: '1988-03-15',
    age: 38,
    gender: 'Male',
    country: 'India',
    state: 'Maharashtra',
    city: 'Mumbai',
    address: '204, Aram Nagar Part 2, Versova, Andheri West',
    postalCode: '400061',
    role: 'audience',
    category: 'Direction',
    experience: '10+ Years',
    skills: ['Casting', 'Talent Development', 'Directing', 'Production'],
    languages: ['Hindi', 'English', 'Bengali'],
    preferredLanguage: ['Hindi', 'English'],
    qualification: 'Film Direction',
    institute: 'Whistling Woods International',
    occupation: 'Casting Director & Filmmaker',
    availableFor: ['Feature Films', 'Web Series'],
    union: 'Yes',
    relocate: 'No',
    height: 177,
    weight: 74,
    bodyType: 'Average',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Direction', 'Casting'],
    travelAvailability: 'Across India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[8],
    headshot: portraitUrls[8],
    fullBody: portraitUrls[9],
    introVideo: sampleVideoUrl,
    previousWork: ['The Long Weekend', 'Glass Harbour'],
    instagram: 'https://instagram.com/ishaanroycasting',
    youtube: 'https://youtube.com/@ishaanroy',
    facebookUrl: 'https://facebook.com/ishaan.roy.casting',
    imdb: 'https://imdb.com/name/nm9876009',
    website: 'https://example.com/ishaan',
    resume: sampleResumeUrl,
    awards: 'Independent Film Guild Nominee',
    bio: 'Mumbai casting director building thoughtful, inclusive ensembles.',
    trkCode: 'TRK261009',
    emailVerified: true,
  },
  {
    username: 'tara_menon',
    email: 'tara.menon@example.com',
    mobile: '+919876540010',
    fullName: 'Tara Menon',
    stageName: 'Tara Menon',
    dob: '1991-07-22',
    age: 35,
    gender: 'Female',
    country: 'India',
    state: 'Kerala',
    city: 'Kochi',
    address: '3, Panampilly Nagar Main Road',
    postalCode: '682036',
    role: 'audience',
    category: 'Production',
    experience: '7-10 Years',
    skills: ['Film Production', 'Creative Development', 'Line Production', 'Scheduling'],
    languages: ['Malayalam', 'English', 'Hindi'],
    preferredLanguage: ['Malayalam', 'English'],
    qualification: 'Media Studies',
    institute: 'Symbiosis Institute of Media and Communication',
    occupation: 'Film Producer',
    availableFor: ['Films', 'Documentaries'],
    union: 'Yes',
    relocate: 'Yes',
    height: 168,
    weight: 60,
    bodyType: 'Average',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Production'],
    travelAvailability: 'South Asia',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[9],
    headshot: portraitUrls[9],
    fullBody: portraitUrls[10],
    introVideo: sampleVideoUrl,
    previousWork: ['Salt Water', 'A Small Place to Begin'],
    instagram: 'https://instagram.com/tara_produces',
    youtube: 'https://youtube.com/@taramenon',
    facebookUrl: 'https://facebook.com/tara.menon.films',
    imdb: 'https://imdb.com/name/nm9876010',
    website: 'https://example.com/tara',
    resume: sampleResumeUrl,
    awards: 'Coastal Stories Grant, 2024',
    bio: 'Kochi producer developing human-scale features and documentary projects.',
    trkCode: 'TRK261010',
    emailVerified: true,
  },
  {
    username: 'vikram_shah',
    email: 'vikram.shah@example.com',
    mobile: '+919876540011',
    fullName: 'Vikram Shah',
    stageName: 'Vikram Shah',
    dob: '1984-10-05',
    age: 42,
    gender: 'Male',
    country: 'India',
    state: 'Gujarat',
    city: 'Ahmedabad',
    address: '501, Bodakdev Towers, SG Highway',
    postalCode: '380054',
    role: 'audience',
    category: 'Production',
    experience: '10+ Years',
    skills: ['Advertising', 'Commercial Production', 'Brand Films', 'Budgeting'],
    languages: ['Gujarati', 'Hindi', 'English'],
    preferredLanguage: ['Gujarati', 'Hindi'],
    qualification: 'Business Administration',
    institute: 'Gujarat University',
    occupation: 'Commercial Producer',
    availableFor: ['Advertisements', 'Brand Films', 'Television'],
    union: 'No',
    relocate: 'Yes',
    height: 181,
    weight: 82,
    bodyType: 'Average',
    skinTone: 'Medium',
    hairColor: 'Black',
    eyeColor: 'Brown',
    preferredRole: ['Production'],
    travelAvailability: 'India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[10],
    headshot: portraitUrls[10],
    fullBody: portraitUrls[11],
    introVideo: sampleVideoUrl,
    previousWork: ['Bright Days Campaign', 'The Old Station'],
    instagram: 'https://instagram.com/vikramshah_producer',
    youtube: 'https://youtube.com/@vikramshahfilms',
    facebookUrl: 'https://facebook.com/vikram.shah.producer',
    imdb: 'https://imdb.com/name/nm9876011',
    website: 'https://example.com/vikram',
    resume: sampleResumeUrl,
    awards: 'Regional Brand Film Award, 2023',
    bio: 'Ahmedabad producer connecting local stories with national campaigns.',
    trkCode: 'TRK261011',
    emailVerified: true,
  },
  {
    username: 'leela_fernandes',
    email: 'leela.fernandes@example.com',
    mobile: '+919876540012',
    fullName: 'Leela Fernandes',
    stageName: 'Leela Fernandes',
    dob: '1993-05-18',
    age: 33,
    gender: 'Female',
    country: 'India',
    state: 'Goa',
    city: 'Panaji',
    address: '12, Fontainhas Heritage Quarter',
    postalCode: '403001',
    role: 'audience',
    category: 'Direction',
    experience: '5-7 Years',
    skills: ['Auditions', 'Talent Coordination', 'Set Management', 'Casting'],
    languages: ['Konkani', 'English', 'Hindi'],
    preferredLanguage: ['English', 'Hindi'],
    qualification: 'Theatre and Performance',
    institute: 'Goa University',
    occupation: 'Casting Coordinator',
    availableFor: ['Films', 'Advertisements', 'Short Films'],
    union: 'No',
    relocate: 'Yes',
    height: 165,
    weight: 57,
    bodyType: 'Average',
    skinTone: 'Olive',
    hairColor: 'Brown',
    eyeColor: 'Brown',
    preferredRole: ['Casting', 'Direction'],
    travelAvailability: 'West India',
    nightShoots: 'Yes',
    profilePhoto: portraitUrls[11],
    headshot: portraitUrls[11],
    fullBody: portraitUrls[0],
    introVideo: sampleVideoUrl,
    previousWork: ['Blue Veranda', 'Island Stories'],
    instagram: 'https://instagram.com/leela_casting',
    youtube: 'https://youtube.com/@leelafernandes',
    facebookUrl: 'https://facebook.com/leela.fernandes.goa',
    imdb: 'https://imdb.com/name/nm9876012',
    website: 'https://example.com/leela',
    resume: sampleResumeUrl,
    awards: 'Goa Short Film Showcase, 2025',
    bio: 'Panaji casting coordinator who makes first-time performers feel at home.',
    trkCode: 'TRK261012',
    emailVerified: true,
  },
];

const auditionData: Array<Omit<typeof schema.auditions.$inferInsert, 'creatorId'>> = [
  {
    title: 'Monsoon Letters',
    category: 'Acting',
    role: 'Principal Lead Actor',
    roleAgeMin: 25,
    roleAgeMax: 35,
    roleGender: 'Male',
    location: 'Mumbai',
    pay: 'Paid, ₹18,000/day',
    deadline: '2027-12-20',
    lang: 'Hindi, English',
    desc: 'Seeking a grounded performer for an intimate feature about two siblings returning home during monsoon season.',
    status: 'OPEN',
  },
  {
    title: 'New Faces: Spring Campaign',
    category: 'Costumes',
    role: 'Fashion & Wardrobe Stylist / Model',
    roleAgeMin: 20,
    roleAgeMax: 30,
    roleGender: 'Female',
    location: 'Delhi',
    pay: 'Paid, ₹45,000 project fee',
    deadline: '2027-12-15',
    lang: 'Hindi, English',
    desc: 'A lifestyle campaign for an Indian design label. Please include recent portfolio and styling work.',
    status: 'OPEN',
  },
  {
    title: 'Pulse on the Roof',
    category: 'Dancing',
    role: 'Contemporary Lead Dancer',
    roleAgeMin: 22,
    roleAgeMax: 32,
    roleGender: 'Male',
    location: 'Bengaluru',
    pay: 'Paid, ₹12,000/day',
    deadline: '2027-12-10',
    lang: 'Any',
    desc: 'Auditioning versatile dancers for a rooftop performance film. Contemporary and street styles are welcome.',
    status: 'OPEN',
  },
  {
    title: 'The Blue Courtyard',
    category: 'Acting',
    role: 'Supporting Actor',
    roleAgeMin: 30,
    roleAgeMax: 45,
    roleGender: 'Female',
    location: 'Chennai',
    pay: 'Paid, ₹15,000/day',
    deadline: '2027-12-28',
    lang: 'Tamil',
    desc: 'Looking for an expressive supporting actor for a family drama pilot. Theatre experience is a plus.',
    status: 'OPEN',
  },
  {
    title: 'River Tales: Voice Edition',
    category: 'Audiography',
    role: 'Lead Voice Artist & Foley Performer',
    roleAgeMin: 25,
    roleAgeMax: 50,
    roleGender: 'Male',
    location: 'Remote',
    pay: 'Paid, ₹8,000/session',
    deadline: '2027-12-18',
    lang: 'Bengali, Hindi',
    desc: 'Warm, clear voices needed for an animated short anthology. Home recording setup preferred.',
    status: 'OPEN',
  },
  {
    title: 'Paper Moons',
    category: 'Acting',
    role: 'Lead Protagonist',
    roleAgeMin: 22,
    roleAgeMax: 30,
    roleGender: 'Female',
    location: 'Hyderabad',
    pay: 'Paid, ₹16,000/day',
    deadline: '2027-01-05',
    lang: 'Hindi, Urdu',
    desc: 'An independent drama seeking a nuanced lead performer. Audition sides and self-tape instructions are provided after applying.',
    status: 'OPEN',
  },
  {
    title: 'Northline Active',
    category: 'Stunts',
    role: 'Athletic Stunt Performer',
    roleAgeMin: 25,
    roleAgeMax: 35,
    roleGender: 'Male',
    location: 'Chandigarh',
    pay: 'Paid, ₹35,000 project fee',
    deadline: '2027-12-22',
    lang: 'Hindi, Punjabi',
    desc: 'Sportswear campaign casting for an energetic, natural on-camera presence with parkour or martial arts background.',
    status: 'OPEN',
  },
  {
    title: 'Rain Room',
    category: 'Dancing',
    role: 'Kathak & Contemporary Dancers',
    roleAgeMin: 20,
    roleAgeMax: 30,
    roleGender: 'Female',
    location: 'Kolkata',
    pay: 'Paid, ₹10,000/day',
    deadline: '2027-01-12',
    lang: 'Bengali, Hindi, English',
    desc: 'Movement-led short film looking for trained dancers comfortable blending classical and contemporary forms.',
    status: 'OPEN',
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
      // 1. Delete dependent tables first to respect foreign key constraints
      await tx.delete(schema.activityLogs);
      await tx.delete(schema.notifications);
      await tx.delete(schema.commentLikes);
      await tx.delete(schema.comments);
      await tx.delete(schema.videoLikes);
      await tx.delete(schema.videos);
      await tx.delete(schema.storyReplies);
      await tx.delete(schema.storyLikes);
      await tx.delete(schema.storyViews);
      await tx.delete(schema.stories);
      await tx.delete(schema.applications);
      await tx.delete(schema.auditions);
      await tx.delete(schema.messages);
      await tx.delete(schema.chatParticipants);
      await tx.delete(schema.chats);
      await tx.delete(schema.follows);
      await tx.delete(schema.faceAttempts);
      await tx.delete(schema.faceChallenges);
      await tx.delete(schema.faceTemplates);
      await tx.delete(schema.biometricConsents);
      await tx.delete(schema.users);

      // 2. Insert Users
      const members = await tx.insert(schema.users).values(
        profileData.map((profile) => ({ ...profile, password: hashedPassword })),
      ).returning();

      // 3. Insert Stories (24-hour expiration)
      const storyRows = await tx.insert(schema.stories).values(
        members.map((member, index) => ({
          creatorId: member.id,
          mediaUrl: index % 4 === 0 ? sampleVideoUrl : member.profilePhoto!,
          mediaType: index % 4 === 0 ? 'video' : 'image',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })),
      ).returning();

      // 4. Insert Story Views
      await tx.insert(schema.storyViews).values(
        storyRows.map((story, index) => ({
          storyId: story.id,
          viewerId: members[(index + 1) % members.length].id,
        })),
      );

      // 5. Insert Story Likes
      await tx.insert(schema.storyLikes).values(
        storyRows.flatMap((story, index) => [
          {
            storyId: story.id,
            userId: members[(index + 2) % members.length].id,
          },
        ]),
      );

      // 6. Insert Story Replies
      await tx.insert(schema.storyReplies).values(
        storyRows.slice(0, 6).map((story, index) => ({
          storyId: story.id,
          userId: members[(index + 3) % members.length].id,
          text: ['Great shot! 🔥', 'Love this frame!', 'Incredible energy!', 'Looking forward to the release!'][index % 4],
        })),
      );

      // 7. Insert Video & Photo Posts
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
              'Monologue: The quiet decision',
              'Movement study in blue',
              'A day in the studio',
              'The last train home',
              'Character voice reel',
              'Two minutes before dawn',
              'Northline campaign test',
              'Rain room rehearsal',
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

      // 8. Insert Video Likes
      await tx.insert(schema.videoLikes).values(
        posts.flatMap((post) =>
          members
            .filter((member) => member.id !== post.creatorId)
            .slice(0, 2)
            .map((member) => ({ videoId: post.id, userId: member.id })),
        ),
      );

      // 9. Insert Comments & Comment Likes
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

      // 10. Insert Auditions (Casting Calls with cinema craft categories)
      const auditions = await tx.insert(schema.auditions).values(
        auditionData.map((audition, index) => ({
          ...audition,
          creatorId: members[8 + (index % 4)].id,
        })),
      ).returning();

      // 11. Insert Applications
      const applications = await tx.insert(schema.applications).values(
        auditions.flatMap((audition, index) =>
          [0, 1].map((applicantOffset) => {
            const applicant = members[(index * 2 + applicantOffset) % 8];
            return {
              auditionId: audition.id,
              applicantId: applicant.id,
              coverLetter: `I am interested in ${audition.title} and believe my ${applicant.category} experience is a strong fit.`,
              status: ['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'][(index + applicantOffset) % 4],
              details: applicantOffset === 0 ? 'Please share your latest self-tape.' : 'Application received by the casting team.',
            };
          }),
        ),
      ).returning();

      // 12. Insert Follows Relationships
      await tx.insert(schema.follows).values(
        members.flatMap((member, index) =>
          [1, 2, 3].map((offset) => ({
            followerId: member.id,
            followingId: members[(index + offset) % members.length].id,
          })),
        ),
      );

      // 13. Insert Chats, Participants & Messages
      const chatPairs = Array.from({ length: 6 }, (_, index) => [members[index], members[index + 6]]);
      const chats = await tx.insert(schema.chats).values(chatPairs.map(() => ({}))).returning();

      await tx.insert(schema.chatParticipants).values(
        chats.flatMap((chat, index) =>
          chatPairs[index].map((member) => ({
            chatId: chat.id,
            userId: member.id,
          })),
        ),
      );

      await tx.insert(schema.messages).values(
        chats.flatMap((chat, index) => [
          {
            chatId: chat.id,
            senderId: chatPairs[index][0].id,
            text: 'Hi! I saw your recent work and wanted to connect.',
          },
          {
            chatId: chat.id,
            senderId: chatPairs[index][1].id,
            text: 'Thanks for reaching out. Happy to share more details about upcoming projects.',
          },
        ]),
      );

      // 14. Insert Notifications
      await tx.insert(schema.notifications).values(
        members.map((member, index) => ({
          userId: member.id,
          actorId: members[(index + 1) % members.length].id,
          type: index % 2 === 0 ? 'AUDITION_APPLIED' : 'POST_LIKED',
          title: index % 2 === 0 ? 'Welcome to Casting' : 'Your profile is ready to explore',
          text: index % 2 === 0
            ? 'Discover new auditions, meet collaborators and share your work.'
            : 'Add your latest portfolio work and follow creators in your community.',
          entityType: index % 2 === 0 ? 'AUDITION' : 'VIDEO',
          entityId: index % 2 === 0 ? auditions[0].id : posts[0].id,
          read: index % 3 === 0,
        })),
      );

      // 15. Insert Activity Logs
      await tx.insert(schema.activityLogs).values([
        ...members.map((member) => ({
          userId: member.id,
          action: 'REGISTER',
          entity: 'user',
          entityId: member.id,
          details: { source: 'seed_script' },
          ipAddress: '127.0.0.1',
          userAgent: 'SeedRunner/1.0',
        })),
        ...auditions.map((audition) => ({
          userId: audition.creatorId,
          action: 'AUDITION_CREATE',
          entity: 'audition',
          entityId: audition.id,
          details: { title: audition.title },
          ipAddress: '127.0.0.1',
          userAgent: 'SeedRunner/1.0',
        })),
        ...applications.map((application) => ({
          userId: application.applicantId,
          action: 'APPLICATION_SUBMIT',
          entity: 'application',
          entityId: application.id,
          details: { auditionId: application.auditionId },
          ipAddress: '127.0.0.1',
          userAgent: 'SeedRunner/1.0',
        })),
      ]);

      // 16. Ensure Admin User exists
      const adminEmail = 'admin@castingexpo.com';
      const [existingAdmin] = await tx
        .select()
        .from(schema.adminUsers)
        .where(eq(schema.adminUsers.email, adminEmail))
        .limit(1);

      if (!existingAdmin) {
        const hashedAdminPassword = await bcrypt.hash('Admin@123', 10);
        await tx.insert(schema.adminUsers).values({
          email: adminEmail,
          password: hashedAdminPassword,
          fullName: 'Super Admin',
          role: 'super_admin',
          isActive: true,
        });
      }
    });

    console.log('✅ Seed completed successfully matching current schema:');
    console.log('   - 12 Users (8 Artists, 4 Audience/Organizers with complete profiles & emailVerified: true)');
    console.log('   - 12 Stories with Views, Likes, and Replies');
    console.log('   - Video & Photo Posts with Likes, Comments, and Comment Likes');
    console.log('   - 8 Auditions with valid Cinema Crafts categories, age limits, gender, and status');
    console.log('   - 16 Applications with statuses (PENDING, SHORTLISTED, ACCEPTED, REJECTED)');
    console.log('   - Follow relationships, Direct Chats, and Messages');
    console.log('   - System Notifications & Audit Activity Logs');
    console.log('   - Super Admin User (admin@castingexpo.com / Admin@123)');
    console.log('');
    console.log('Demo user credentials:');
    console.log('   Artist:   seeduser@example.com / password123');
    console.log('   Admin:    admin@castingexpo.com / Admin@123');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Unable to start seed:', error);
  process.exitCode = 1;
});
