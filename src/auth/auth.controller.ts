import {
  BadRequestException,
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user profile as either an Artist or Audience',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created. Returns JWT token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or email already taken.',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Credentials validated successfully. Returns JWT token.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password credentials.',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or register automatically using Firebase Google ID Token',
  })
  @ApiResponse({
    status: 200,
    description:
      'Google token verified successfully. Returns JWT token and user profile.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired Google ID token.',
  })
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a password reset link by email' })
  @ApiResponse({
    status: 200,
    description:
      'If the account exists, a reset email was sent. In local dev mode, the response includes resetToken for Swagger testing.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        resetToken: {
          type: 'string',
          description:
            'Returned only when PASSWORD_RESET_DEV_MODE is enabled outside production.',
        },
      },
    },
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Get(['reset-link', 'reset-password'])
  @ApiOperation({ summary: 'Show the browser password reset form' })
  resetLink(@Query('token') token: string, @Res() res: Response) {
    this.setResetPageHeaders(res);
    if (!this.isResetToken(token)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .type('html')
        .send(
          this.resetPage(
            'Invalid reset link',
            'This reset link is invalid. Request a new password reset email.',
          ),
        );
    }

    return res.type('html').send(this.resetForm(token));
  }

  @Post('reset-password-form')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit the browser password reset form' })
  async submitResetPasswordForm(
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    this.setResetPageHeaders(res);
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const confirmation =
      typeof body?.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!this.isResetToken(token)) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .type('html')
        .send(
          this.resetPage(
            'Invalid reset link',
            'This reset link is invalid. Request a new password reset email.',
          ),
        );
    }
    if (password.length < 8 || password.length > 128) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .type('html')
        .send(
          this.resetForm(
            token,
            'Password must be between 8 and 128 characters.',
          ),
        );
    }
    if (password !== confirmation) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .type('html')
        .send(this.resetForm(token, 'The passwords do not match.'));
    }

    try {
      await this.authService.resetPassword({ token, password });
    } catch (error) {
      if (!(error instanceof BadRequestException)) {
        throw error;
      }
      return res
        .status(HttpStatus.BAD_REQUEST)
        .type('html')
        .send(
          this.resetPage(
            'Reset link expired',
            'This reset link is invalid or has expired. Request a new password reset email.',
          ),
        );
    }

    return res
      .type('html')
      .send(
        this.resetPage(
          'Password updated',
          'Your password has been changed. You can now sign in with your new password.',
        ),
      );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password successfully reset.' })
  @ApiResponse({
    status: 400,
    description: 'The reset token is invalid or expired.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  private isResetToken(token: unknown): token is string {
    return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
  }

  private setResetPageHeaders(res: Response) {
    res.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    });
  }

  private resetForm(token: string, errorMessage?: string): string {
    const message = errorMessage
      ? `<p class="error" role="alert">${this.escapeHtml(errorMessage)}</p>`
      : '';
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your password</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f5f7; color: #18202a; margin: 0; padding: 32px 16px; }
      main { max-width: 420px; margin: 6vh auto; padding: 28px; background: white; border-radius: 12px; box-shadow: 0 8px 28px #18202a18; }
      h1 { margin-top: 0; font-size: 24px; }
      label { display: block; margin: 18px 0 6px; font-weight: 600; }
      input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #aeb7c2; border-radius: 6px; font-size: 16px; }
      button { width: 100%; margin-top: 22px; padding: 12px; border: 0; border-radius: 6px; background: #174ea6; color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
      .error { color: #b42318; }
      .hint { color: #576273; font-size: 14px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Reset your password</h1>
      <p class="hint">Choose a new password between 8 and 128 characters.</p>
      ${message}
      <form method="post" action="/auth/reset-password-form">
        <input type="hidden" name="token" value="${this.escapeHtml(token)}" />
        <label for="password">New password</label>
        <input id="password" name="password" type="password" minlength="8" maxlength="128" autocomplete="new-password" required />
        <label for="confirmPassword">Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="128" autocomplete="new-password" required />
        <button type="submit">Update password</button>
      </form>
    </main>
  </body>
</html>`;
  }

  private resetPage(title: string, message: string): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${this.escapeHtml(title)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f4f5f7; color: #18202a; margin: 0; padding: 32px 16px; }
      main { max-width: 420px; margin: 6vh auto; padding: 28px; background: white; border-radius: 12px; box-shadow: 0 8px 28px #18202a18; }
    </style>
  </head>
  <body><main><h1>${this.escapeHtml(title)}</h1><p>${this.escapeHtml(message)}</p></main></body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character];
    });
  }
}
