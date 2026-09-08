import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'Johnny', description: 'Stage name or handle' })
  @IsOptional()
  @IsString()
  stageName?: string;

  @ApiPropertyOptional({ example: '1995-05-15', description: 'Date of birth' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional({ example: 'Male', description: 'Gender' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'India', description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Maharashtra', description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Mumbai', description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', description: 'Profile photo URL' })
  @IsOptional()
  @IsString()
  profilePhoto?: string;

  @ApiPropertyOptional({ example: 'Actor', description: 'Category (Actor, Model, Dancer, etc.)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '5 years in theatre and commercials', description: 'Experience' })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiPropertyOptional({ example: ['Acting', 'Dancing', 'Singing'], description: 'Skills array' })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiPropertyOptional({ example: ['Hindi', 'English'], description: 'Languages spoken' })
  @IsOptional()
  @IsArray()
  languages?: string[];

  @ApiPropertyOptional({ example: ['Hindi'], description: 'Preferred language for roles' })
  @IsOptional()
  @IsArray()
  preferredLanguage?: string[];

  @ApiPropertyOptional({ example: 'Bachelor of Fine Arts', description: 'Educational qualification' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ example: 'National School of Drama', description: 'Institute' })
  @IsOptional()
  @IsString()
  institute?: string;

  @ApiPropertyOptional({ example: 'Freelance Actor', description: 'Occupation' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ example: ['Movies', 'Commercials', 'Web Series'], description: 'Available for work types' })
  @IsOptional()
  @IsArray()
  availableFor?: string[];

  @ApiPropertyOptional({ example: 'Yes', description: 'Cine Artistes Association Union Member' })
  @IsOptional()
  @IsString()
  union?: string;

  @ApiPropertyOptional({ example: 'Yes', description: 'Willing to relocate' })
  @IsOptional()
  @IsString()
  relocate?: string;

  @ApiPropertyOptional({ example: 178, description: 'Height in cm' })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ example: 70, description: 'Weight in kg' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ example: 'Athletic', description: 'Body type' })
  @IsOptional()
  @IsString()
  bodyType?: string;

  @ApiPropertyOptional({ example: 'Fair', description: 'Skin tone' })
  @IsOptional()
  @IsString()
  skinTone?: string;

  @ApiPropertyOptional({ example: 'Black', description: 'Hair color' })
  @IsOptional()
  @IsString()
  hairColor?: string;

  @ApiPropertyOptional({ example: 'Brown', description: 'Eye color' })
  @IsOptional()
  @IsString()
  eyeColor?: string;

  @ApiPropertyOptional({ example: ['Lead Role', 'Supporting Role'], description: 'Preferred role types' })
  @IsOptional()
  @IsArray()
  preferredRole?: string[];

  @ApiPropertyOptional({ example: 'Worldwide', description: 'Travel availability' })
  @IsOptional()
  @IsString()
  travelAvailability?: string;

  @ApiPropertyOptional({ example: 'Yes', description: 'Night shoots availability' })
  @IsOptional()
  @IsString()
  nightShoots?: string;

  @ApiPropertyOptional({ example: 'https://example.com/headshot.jpg', description: 'Headshot URL' })
  @IsOptional()
  @IsString()
  headshot?: string;

  @ApiPropertyOptional({ example: 'https://example.com/fullbody.jpg', description: 'Full body photo URL' })
  @IsOptional()
  @IsString()
  fullBody?: string;

  @ApiPropertyOptional({ example: 'https://example.com/intro.mp4', description: 'Intro video URL' })
  @IsOptional()
  @IsString()
  introVideo?: string;

  @ApiPropertyOptional({ example: ['Movie A (2024)', 'Ad B (2025)'], description: 'Previous work list' })
  @IsOptional()
  @IsArray()
  previousWork?: string[];

  @ApiPropertyOptional({ example: 'https://instagram.com/actor', description: 'Instagram profile' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@actor', description: 'YouTube channel' })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://imdb.com/name/nm123', description: 'IMDb profile' })
  @IsOptional()
  @IsString()
  imdb?: string;

  @ApiPropertyOptional({ example: 'https://actorwebsite.com', description: 'Personal website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'https://example.com/resume.pdf', description: 'Resume PDF URL' })
  @IsOptional()
  @IsString()
  resume?: string;

  @ApiPropertyOptional({ example: 'Best Male Actor Award 2024', description: 'Awards' })
  @IsOptional()
  @IsString()
  awards?: string;

  @ApiPropertyOptional({ example: 'Passionate actor based in Mumbai with experience in feature films.', description: 'Bio' })
  @IsOptional()
  @IsString()
  bio?: string;
}
