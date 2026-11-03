import { ServiceUnavailableException } from '@nestjs/common';
import { HelpService } from './help.service';

describe('HelpService', () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFetch = global.fetch;
  let service: HelpService;
  let userRepository: { findHelpDetailsById: jest.Mock };

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-resend-key';
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    userRepository = {
      findHelpDetailsById: jest.fn().mockResolvedValue({
        id: 'user-id',
        fullName: 'Test User',
        email: 'user@example.com',
        role: 'artist',
      }),
    };
    service = new HelpService(userRepository as any);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalApiKey;
    }
    global.fetch = originalFetch;
  });

  it('emails the support address from info@teensss.com with the user details', async () => {
    await expect(
      service.sendMessage('user-id', 'Please help.'),
    ).resolves.toEqual({ message: 'Help message sent successfully.' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: JSON.stringify({
          from: 'info@teensss.com',
          to: ['teenssoftwaresolutionsllp@gmail.com'],
          subject: 'Help request from Test User',
          text: 'User details:\n{\n  "id": "user-id",\n  "fullName": "Test User",\n  "email": "user@example.com",\n  "role": "artist"\n}\n\nHelp message:\nPlease help.',
        }),
      }),
    );
    expect(userRepository.findHelpDetailsById).toHaveBeenCalledWith('user-id');
  });

  it('reports provider delivery failures instead of returning success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    await expect(
      service.sendMessage('user-id', 'Please help.'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
