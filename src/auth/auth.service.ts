import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../users/user.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { FirebaseService } from './firebase.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('A user with this email address already exists.');
    }

    const existingUsername = await this.userRepository.findByUsername(dto.username);
    if (existingUsername) {
      throw new BadRequestException('A user with this username already exists.');
    }

    if (dto.mobile) {
      const existingMobile = await this.userRepository.findByMobile(dto.mobile);
      if (existingMobile) {
        throw new BadRequestException('A user with this mobile number already exists.');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate unique TRK code (e.g., TRK260001)
    const trkCode = await this.userRepository.generateTrkCode();
    
    // Construct user DB record
    const user = await this.userRepository.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName || dto.username,
      role: dto.role,
      mobile: dto.mobile,
      age: dto.age,
      stageName: dto.stageName,
      dob: dto.dob,
      gender: dto.gender,
      country: dto.country,
      state: dto.state,
      city: dto.city,
      profilePhoto: dto.profilePhoto,
      trkCode,
      
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
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        mobile: user.mobile,
        age: user.age,
        gender: user.gender,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trkCode: user.trkCode,
      },
    };
  }

  async login(dto: LoginDto) {
    const { identifier, password } = dto;
    let user: any = null;

    // Determine the identifier type and find the user
    if (identifier.includes('@')) {
      // Looks like an email
      user = await this.userRepository.findByEmail(identifier);
    } else if (identifier.toUpperCase().startsWith('TRK')) {
      // Looks like a TRK code
      user = await this.userRepository.findByTrkCode(identifier.toUpperCase());
    } else {
      // Treat as mobile number
      user = await this.userRepository.findByMobile(identifier);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials. No account found with the provided identifier.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials. Password does not match.');
    }

    const token = await this.generateToken(user.id, user.email || '', user.role);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        mobile: user.mobile,
        age: user.age,
        gender: user.gender,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trkCode: user.trkCode,
      },
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    const decoded = await this.firebaseService.verifyIdToken(dto.idToken);
    const email = decoded.email;
    if (!email) {
      throw new BadRequestException('Google account does not have an associated email address.');
    }

    let user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Generate TRK code for new Google users too
      const trkCode = await this.userRepository.generateTrkCode();
      const randomPassword = await bcrypt.hash(crypto.randomUUID(), 10);
      user = await this.userRepository.create({
        email,
        password: randomPassword,
        fullName: decoded.name || email.split('@')[0] || 'Google User',
        profilePhoto: decoded.picture || null,
        role: 'artist',
        trkCode,
      });
    }

    const token = await this.generateToken(user.id, user.email || '', user.role);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        mobile: user.mobile,
        age: user.age,
        gender: user.gender,
        role: user.role,
        profilePhoto: user.profilePhoto,
        trkCode: user.trkCode,
      },
      message: 'Google login successful',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const message = 'If an account exists for that email, a password reset link has been sent.';
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const publicBaseUrl = (process.env.BACKEND_URL || process.env.FRONTEND_URL)?.replace(/\/+$/, '');
    const devMode =
      process.env.PASSWORD_RESET_DEV_MODE === 'true' &&
      process.env.NODE_ENV === 'development';
    if (!devMode && (!apiKey || !fromEmail || !publicBaseUrl)) {
      throw new ServiceUnavailableException('Password reset email is not configured.');
    }

    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      return { message };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await this.userRepository.setPasswordResetToken(
      user.id,
      tokenHash,
      new Date(Date.now() + 30 * 60 * 1000),
    );

    if (devMode) {
      return { message, resetToken: token };
    }

    try {
      const resetUrl = `${publicBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [user.email || dto.email],
          subject: 'Reset your Casting account password',
          text: `Use this link to reset your password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Resend returned HTTP ${response.status}`);
      }
    } catch {
      await this.userRepository.clearPasswordResetToken(user.id, tokenHash);
      throw new ServiceUnavailableException('Unable to send the password reset email.');
    }

    return { message };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (typeof dto.token !== 'string' || !dto.token) {
      throw new BadRequestException('A password reset token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const updated = await this.userRepository.resetPasswordWithToken(tokenHash, hashedPassword);
    if (!updated) {
      throw new BadRequestException('The password reset token is invalid or expired.');
    }

    return { message: 'Password successfully reset.' };
  }

  private async generateToken(userId: string, email: string, role: string): Promise<string> {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload);
  }
}
