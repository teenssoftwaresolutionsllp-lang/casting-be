/// <reference types="jest" />

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
      resetPassword: jest.fn(),
    };
    controller = new AuthController(mockAuthService);
  });

  it('renders a browser password reset form instead of opening the app', () => {
    const res = {
      set: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    controller.resetLink('a'.repeat(64), res);

    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      }),
    );
    expect(res.type).toHaveBeenCalledWith('html');
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('action="/auth/reset-password-form"'),
    );
    expect(res.send.mock.calls[0][0]).not.toContain('casting://');
  });

  it('rejects malformed reset tokens without rendering a password form', () => {
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    controller.resetLink('<script>', res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('This reset link is invalid.'),
    );
    expect(res.send.mock.calls[0][0]).not.toContain('<script>');
  });

  it('submits matching browser passwords to the existing reset service', async () => {
    mockAuthService.resetPassword.mockResolvedValue({
      message: 'Password successfully reset.',
    });
    const res = {
      set: jest.fn(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await controller.submitResetPasswordForm(
      {
        token: 'a'.repeat(64),
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      },
      res,
    );

    expect(mockAuthService.resetPassword).toHaveBeenCalledWith({
      token: 'a'.repeat(64),
      password: 'NewPassword123!',
    });
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('Your password has been changed.'),
    );
  });

  it('does not submit mismatched browser passwords', async () => {
    const res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as any;

    await controller.submitResetPasswordForm(
      {
        token: 'a'.repeat(64),
        password: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!',
      },
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining('The passwords do not match.'),
    );
  });

  describe('googleLogin', () => {
    it('delegates google login to authService', async () => {
      const mockResult = {
        token: 'test-jwt',
        user: {
          id: 'u1',
          email: 'test@gmail.com',
          fullName: 'Test',
          role: 'artist',
          profilePhoto: null,
        },
        message: 'Google login successful',
      };
      mockAuthService.googleLogin.mockResolvedValue(mockResult);

      const res = await controller.googleLogin({ idToken: 'sample-token' });
      expect(res).toEqual(mockResult);
      expect(mockAuthService.googleLogin).toHaveBeenCalledWith({
        idToken: 'sample-token',
      });
    });

    describe('AuthController HTTP password reset flow', () => {
      let app: INestApplication<App>;
      const authService = {
        resetPassword: jest.fn(),
      };

      beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
          controllers: [AuthController],
          providers: [{ provide: AuthService, useValue: authService }],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
      });

      afterAll(async () => {
        await app.close();
      });

      beforeEach(() => {
        authService.resetPassword.mockResolvedValue({
          message: 'Password successfully reset.',
        });
      });

      it('serves the HTML form and accepts its URL-encoded submission', async () => {
        const token = 'a'.repeat(64);
        const page = await request(app.getHttpServer())
          .get('/auth/reset-password')
          .query({ token })
          .expect(200)
          .expect('Content-Type', /html/);

        expect(page.text).toContain('action="/auth/reset-password-form"');

        const result = await request(app.getHttpServer())
          .post('/auth/reset-password-form')
          .type('form')
          .send({
            token,
            password: 'NewPassword123!',
            confirmPassword: 'NewPassword123!',
          })
          .expect(200)
          .expect('Content-Type', /html/);

        expect(result.text).toContain('Your password has been changed.');
        expect(authService.resetPassword).toHaveBeenCalledWith({
          token,
          password: 'NewPassword123!',
        });
      });
    });
  });
});
