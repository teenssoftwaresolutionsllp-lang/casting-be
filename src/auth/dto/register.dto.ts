import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'Strong password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Jane Doe', description: 'User full name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'artist', enum: ['artist', 'audience'], description: 'Account role type' })
  @IsEnum(['artist', 'audience'])
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ example: '+91 9876543210', description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiPropertyOptional({ example: 'Jane Austen', description: 'Artist stage name' })
  @IsString()
  @IsOptional()
  stageName?: string;

  @ApiPropertyOptional({ example: '1998-05-15', description: 'Date of birth' })
  @IsString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ example: 'Female', enum: ['Male', 'Female', 'Other', 'Prefer not to say'], description: 'Gender identity' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country location' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State location' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'City location' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/avatar.jpg', description: 'Profile image URL' })
  @IsString()
  @IsOptional()
  profilePhoto?: string;

  // Professional Specs (Artist role)
  @ApiPropertyOptional({ example: 'Actor', description: 'Artist talent category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: '3-5 Years', description: 'Years of professional experience' })
  @IsString()
  @IsOptional()
  experience?: string;

  @ApiPropertyOptional({ type: [String], example: ['Acting', 'Screenwriting'], description: 'Specialized skills and crafts' })
  @IsArray()
  @IsOptional()
  skills?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Hindi', 'English'], description: 'Languages spoken' })
  @IsArray()
  @IsOptional()
  languages?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Hindi'], description: 'Languages willing to perform in' })
  @IsArray()
  @IsOptional()
  preferredLanguage?: string[];

  @ApiPropertyOptional({ example: 'Graduate', description: 'Highest education level' })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiPropertyOptional({ example: 'National School of Drama', description: 'Acting academy or institute name' })
  @IsString()
  @IsOptional()
  institute?: string;

  @ApiPropertyOptional({ example: 'Full-Time Artist', description: 'Current occupation' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ type: [String], example: ['Movies', 'Web Series'], description: 'Types of projects available for' })
  @IsArray()
  @IsOptional()
  availableFor?: string[];

  @ApiPropertyOptional({ example: 'No', description: 'Union membership status' })
  @IsString()
  @IsOptional()
  union?: string;

  @ApiPropertyOptional({ example: 'Yes', description: 'Willingness to relocate for shoots' })
  @IsString()
  @IsOptional()
  relocate?: string;

  // Physical Specs
  @ApiPropertyOptional({ example: 172, description: 'Height in centimeters' })
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ example: 64, description: 'Weight in kilograms' })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ example: 'Athletic', description: 'Physical build category' })
  @IsString()
  @IsOptional()
  bodyType?: string;

  @ApiPropertyOptional({ example: 'Wheatish', description: 'Skin tone category' })
  @IsString()
  @IsOptional()
  skinTone?: string;

  @ApiPropertyOptional({ example: 'Black', description: 'Hair color' })
  @IsString()
  @IsOptional()
  hairColor?: string;

  @ApiPropertyOptional({ example: 'Brown', description: 'Eye color' })
  @IsString()
  @IsOptional()
  eyeColor?: string;

  @ApiPropertyOptional({ type: [String], example: ['Hero', 'Character Artist'], description: 'Preferred roles to audition for' })
  @IsArray()
  @IsOptional()
  preferredRole?: string[];

  @ApiPropertyOptional({ example: 'Anywhere', description: 'Travel bounds availability' })
  @IsString()
  @IsOptional()
  travelAvailability?: string;

  @ApiPropertyOptional({ example: 'Yes', description: 'Available for night shifts' })
  @IsString()
  @IsOptional()
  nightShoots?: string;

  // Portfolio & Media
  @ApiPropertyOptional({ example: 'https://cloudinary.com/headshot.jpg', description: 'Headshot portfolio image URL' })
  @IsString()
  @IsOptional()
  headshot?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/fullbody.jpg', description: 'Full body portfolio image URL' })
  @IsString()
  @IsOptional()
  fullBody?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/intro.mp4', description: 'Self-taped intro video link' })
  @IsString()
  @IsOptional()
  introVideo?: string;

  @ApiPropertyOptional({ type: [String], example: ['Short Film', 'Advertisement'], description: 'Past project category work history' })
  @IsArray()
  @IsOptional()
  previousWork?: string[];

  @ApiPropertyOptional({ example: 'https://instagram.com/jane', description: 'Instagram social link' })
  @IsString()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/jane', description: 'YouTube channel link' })
  @IsString()
  @IsOptional()
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://imdb.com/name/nm123', description: 'IMDb actor profile link' })
  @IsString()
  @IsOptional()
  imdb?: string;

  @ApiPropertyOptional({ example: 'https://janedoe.com', description: 'Personal portfolio website link' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/resume.pdf', description: 'Resume PDF upload URL' })
  @IsString()
  @IsOptional()
  resume?: string;

  @ApiPropertyOptional({ example: 'Best Debut Actor award at State festival', description: 'Awards & Achievements' })
  @IsString()
  @IsOptional()
  awards?: string;

  @ApiPropertyOptional({ example: 'Experienced screen actor with classical training.', description: 'Brief bio details' })
  @IsString()
  @IsOptional()
  bio?: string;
}
