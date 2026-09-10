import { ChatService } from './chat.service';
import { ForbiddenException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let mockChatRepo: any;
  let mockQuotaService: any;

  beforeEach(() => {
    mockChatRepo = {
      sendMessage: jest.fn(),
      findChatBetweenUsers: jest.fn(),
      createChat: jest.fn(),
      getUserChats: jest.fn(),
      getMessages: jest.fn(),
    };
    mockQuotaService = {
      loadFreshQuota: jest.fn(),
      tryConsumeMessage: jest.fn(),
      throwPaywall: jest.fn().mockImplementation((msg, plan) => {
        throw new ForbiddenException({
          paywall: true,
          message: msg,
          remaining: 0,
        });
      }),
    };
    service = new ChatService(mockChatRepo, mockQuotaService);
  });

  describe('sendMessage', () => {
    it('sends message successfully when quota is available', async () => {
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        plan: 'free',
        limits: { messagesPerDay: 5 },
      });
      mockQuotaService.tryConsumeMessage.mockResolvedValue(true);
      mockChatRepo.sendMessage.mockResolvedValue({
        id: 'msg-1',
        text: 'Hello',
      });

      const res = await service.sendMessage('chat-1', 'user-1', 'Hello');
      expect(res).toEqual({ id: 'msg-1', text: 'Hello' });
      expect(mockQuotaService.tryConsumeMessage).toHaveBeenCalledWith('user-1', 5);
      expect(mockChatRepo.sendMessage).toHaveBeenCalledWith('chat-1', 'user-1', 'Hello');
    });

    it('denies message sending and triggers paywall when quota is exceeded', async () => {
      mockQuotaService.loadFreshQuota.mockResolvedValue({
        plan: 'free',
        limits: { messagesPerDay: 5 },
      });
      mockQuotaService.tryConsumeMessage.mockResolvedValue(false);

      await expect(service.sendMessage('chat-1', 'user-1', 'Hello')).rejects.toThrow(ForbiddenException);
      expect(mockQuotaService.throwPaywall).toHaveBeenCalledWith(
        'Daily message limit reached. Upgrade to continue.',
        'free',
      );
      expect(mockChatRepo.sendMessage).not.toHaveBeenCalled();
    });
  });
});
