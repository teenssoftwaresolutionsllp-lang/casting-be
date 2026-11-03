import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UserRepository } from '../users/user.repository';

const SUPPORT_EMAIL = 'teenssoftwaresolutionsllp@gmail.com';
const SUPPORT_SENDER = 'info@teensss.com';

@Injectable()
export class HelpService {
  constructor(private readonly userRepository: UserRepository) {}

  async sendMessage(userId: string, message: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Help message email is not configured.',
      );
    }

    const user = await this.userRepository.findHelpDetailsById(userId);
    if (!user) {
      throw new NotFoundException('Authenticated user was not found.');
    }

    let response: Response;
    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: SUPPORT_SENDER,
          to: [SUPPORT_EMAIL],
          subject: `Help request from ${user.fullName}`,
          text: `User details:\n${JSON.stringify(user, null, 2)}\n\nHelp message:\n${message}`,
        }),
      });
    } catch {
      throw new ServiceUnavailableException('Unable to send the help message.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to send the help message.');
    }

    return { message: 'Help message sent successfully.' };
  }
}
