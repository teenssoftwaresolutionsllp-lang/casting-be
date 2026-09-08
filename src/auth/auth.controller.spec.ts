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
