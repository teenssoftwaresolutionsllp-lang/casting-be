import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService - Change Password', () => {
  let authService: AuthService;
  let userRepository: {
    findById: jest.Mock;
    update: jest.Mock;
    deleteById: jest.Mock;
  };

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
    };
    authService = new AuthService(
      userRepository as any,
      {} as any,
      {} as any,
    );
  });

  it('updates the password after verifying the old password', async () => {
    const oldPassword = 'OldPassword123!';
    const storedHash = await bcrypt.hash(oldPassword, 4);
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      password: storedHash,
    });

    const result = await authService.changePassword('user-1', {
      oldPassword,
      newPassword: 'NewPassword123!',
      confirmNewPassword: 'NewPassword123!',
    });

    expect(result).toEqual({ message: 'Password successfully changed.' });
    const updatedPassword = userRepository.update.mock.calls[0][1].password;
    expect(updatedPassword).not.toBe('NewPassword123!');
    await expect(bcrypt.compare('NewPassword123!', updatedPassword)).resolves.toBe(true);
  });

  it('rejects a wrong old password without updating the account', async () => {
    userRepository.findById.mockResolvedValue({
      id: 'user-1',
      password: await bcrypt.hash('ActualPassword123!', 4),
    });

    await expect(
      authService.changePassword('user-1', {
        oldPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'NewPassword123!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a mismatched new-password confirmation', async () => {
    await expect(
      authService.changePassword('user-1', {
        oldPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmNewPassword: 'DifferentPassword123!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it('deletes the authenticated account and returns confirmation', async () => {
    userRepository.deleteById.mockResolvedValue(true);

    await expect(authService.deleteAccount('user-1')).resolves.toEqual({
      message: 'Account and associated data successfully deleted.',
    });
    expect(userRepository.deleteById).toHaveBeenCalledWith('user-1');
  });

  it('rejects deletion when the authenticated account no longer exists', async () => {
    userRepository.deleteById.mockResolvedValue(false);

    await expect(authService.deleteAccount('user-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
