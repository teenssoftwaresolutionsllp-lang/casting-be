/// <reference types="jest" />

import { AuthController } from './auth.controller';

jest.mock('./firebase.service', () => ({
  FirebaseService: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      googleLogin: jest.fn(),
    };
    controller = new AuthController(mockAuthService);
  });

  it('redirects the reset link to the app deep link', () => {
    const res = {
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    (controller as any).resetLink('token-123', res);

    expect(res.type).toHaveBeenCalledWith('html');
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('casting://reset-password?token=token-123'),
    );
  });

  describe('googleLogin', () => {
    it('delegates google login to authService', async () => {
      const mockResult = {
        token: 'test-jwt',
        user: { id: 'u1', email: 'test@gmail.com', fullName: 'Test', role: 'artist', profilePhoto: null },
        message: 'Google login successful',
      };
      mockAuthService.googleLogin.mockResolvedValue(mockResult);

      const res = await controller.googleLogin({ idToken: 'sample-token' });
      expect(res).toEqual(mockResult);
      expect(mockAuthService.googleLogin).toHaveBeenCalledWith({ idToken: 'sample-token' });
    });
  });
});
