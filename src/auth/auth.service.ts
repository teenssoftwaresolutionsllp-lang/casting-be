import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../users/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('A user with this email address already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Construct user DB record
    const user = await this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: dto.role,
      mobile: dto.mobile,
      stageName: dto.stageName,
      dob: dto.dob,
      gender: dto.gender,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      profilePhoto: dto.profilePhoto,
      
      // Artist-specific specs
      category: dto.category,
      experience: dto.experience,
      skills: dto.skills,
      languages: dto.languages,
      preferredLanguage: dto.preferredLanguage,
      qualification: dto.qualification,
      institute: dto.institute,
      occupation: dto.occupation,
      availableFor: dto.availableFor,
      union: dto.union,
      relocate: dto.relocate,
      
      // Physical specs
      height: dto.height,
      weight: dto.weight,
      bodyType: dto.bodyType,
      skinTone: dto.skinTone,
      hairColor: dto.hairColor,
      eyeColor: dto.eyeColor,
      preferredRole: dto.preferredRole,
      travelAvailability: dto.travelAvailability,
      nightShoots: dto.nightShoots,
      
      // Portfolio
      headshot: dto.headshot,
      fullBody: dto.fullBody,
      introVideo: dto.introVideo,
      previousWork: dto.previousWork,
      instagram: dto.instagram,
      youtube: dto.youtube,
      imdb: dto.imdb,
      website: dto.website,
      resume: dto.resume,
      awards: dto.awards,
      bio: dto.bio,
    });

    const token = await this.generateToken(user.id, user.email || '', user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePhoto: user.profilePhoto,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = await this.generateToken(user.id, user.email || '', user.role);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        profilePhoto: user.profilePhoto,
      },
    };
  }

  private async generateToken(userId: string, email: string, role: string): Promise<string> {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload);
  }
}
