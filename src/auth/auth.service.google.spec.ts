import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

jest.mock('./firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthService - Google Login', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockJwtService: any;
  let mockFirebaseService: any;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: jest.fn(),
      findByMobile: jest.fn(),
      create: jest.fn(),
    };
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-backend-jwt-token'),
    };
    mockFirebaseService = {
      verifyIdToken: jest.fn(),
    };

    authService = new AuthService(
      mockUserRepo,
      mockJwtService,
      mockFirebaseService,
    );
  });

  it('logs in an existing user with valid Google token', async () => {
    mockFirebaseService.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-123',
      email: 'existing@example.com',
      name: 'Existing User',
      picture: 'https://example.com/avatar.jpg',
    });

    mockUserRepo.findByEmail.mockResolvedValue({
      id: 'user-uuid-1',
      email: 'existing@example.com',
      fullName: 'Existing User',
      role: 'artist',
      profilePhoto: 'https://example.com/avatar.jpg',
    });

    const result = await authService.googleLogin({ idToken: 'valid-id-token' });

    expect(result.token).toBe('mock-backend-jwt-token');
    expect(result.message).toBe('Google login successful');
    expect(result.user.id).toBe('user-uuid-1');
    expect(result.user.email).toBe('existing@example.com');
    expect(mockUserRepo.create).not.toHaveBeenCalled();
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-uuid-1',
      email: 'existing@example.com',
      role: 'artist',
    });
  });

  it('automatically registers and logs in a new user when email not found', async () => {
    mockFirebaseService.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-456',
      email: 'newuser@gmail.com',
      name: 'New Google User',
      picture: 'https://example.com/new-pic.jpg',
    });

    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.create.mockImplementation((userData: any) => ({
      id: 'new-user-uuid',
      ...userData,
    }));

    const result = await authService.googleLogin({ idToken: 'valid-new-token' });

    expect(result.token).toBe('mock-backend-jwt-token');
    expect(result.message).toBe('Google login successful');
    expect(result.user.id).toBe('new-user-uuid');
    expect(result.user.email).toBe('newuser@gmail.com');
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@gmail.com',
        fullName: 'New Google User',
        role: 'artist',
        profilePhoto: 'https://example.com/new-pic.jpg',
      }),
    );
  });

  it('throws BadRequestException if Google token does not contain an email', async () => {
    mockFirebaseService.verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid-no-email',
      name: 'No Email User',
    });

    await expect(
      authService.googleLogin({ idToken: 'token-without-email' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws UnauthorizedException when Firebase token verification fails', async () => {
    mockFirebaseService.verifyIdToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired Google ID token.'),
    );

    await expect(
      authService.googleLogin({ idToken: 'invalid-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
