import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      // Avoid re-initializing if already done (e.g., across test runs)
      if (admin.apps.length > 0) {
        this.app = admin.apps[0]!;
        this.initialized = true;
        return;
      }

      const serviceAccountPath = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
      const privateKeyRaw = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

      let credential: admin.credential.Credential;

      if (serviceAccountPath) {
        // Load from JSON file (preferred for production)
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const serviceAccount = require(require('path').resolve(serviceAccountPath));
          credential = admin.credential.cert(serviceAccount);
        } catch {
          this.logger.warn(
            `Could not load service account from path: ${serviceAccountPath}. Falling back to env vars.`,
          );
          credential = this.buildCredentialFromEnv(projectId, clientEmail, privateKeyRaw);
        }
      } else {
        credential = this.buildCredentialFromEnv(projectId, clientEmail, privateKeyRaw);
      }

      this.app = admin.initializeApp({ credential, projectId });
      this.initialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully.');
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin SDK', err);
      this.initialized = false;
    }
  }

  private buildCredentialFromEnv(
    projectId?: string,
    clientEmail?: string,
    privateKeyRaw?: string,
  ): admin.credential.Credential {
    if (!projectId || !clientEmail || !privateKeyRaw) {
      throw new Error(
        'Firebase credentials missing. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY env vars.',
      );
    }
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    return admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  /**
   * Send an FCM push notification to a single device token.
   * Handles invalid/expired tokens gracefully — returns false instead of throwing.
   */
  async sendToToken(token: string, payload: FcmPayload): Promise<boolean> {
    if (!this.initialized || !this.app) {
      this.logger.warn('FCM not initialized — skipping push notification.');
      return false;
    }

    if (!token || token.trim() === '') {
      return false;
    }

    try {
      await this.app.messaging().send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data ?? {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'casting_default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });
      return true;
    } catch (err: any) {
      const invalidCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
        'messaging/invalid-argument',
      ];
      if (invalidCodes.includes(err?.errorInfo?.code)) {
        // Caller should handle token cleanup
        this.logger.warn(`Invalid FCM token detected (will be cleared): ${token.slice(0, 20)}...`);
        return false;
      }
      this.logger.error(`FCM send failed: ${err?.message ?? err}`);
      return false;
    }
  }

  /**
   * Send to multiple tokens, returning a list of invalid tokens that should be purged.
   */
  async sendToMultipleTokens(tokens: string[], payload: FcmPayload): Promise<string[]> {
    if (!this.initialized || !this.app || tokens.length === 0) {
      return [];
    }

    const invalidTokens: string[] = [];
    // Firebase allows up to 500 tokens per multicast message
    const chunks = chunkArray(tokens, 500);

    for (const chunk of chunks) {
      try {
        const response = await this.app.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: payload.data ?? {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'casting_default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const code = resp.error?.code;
            const invalidCodes = [
              'messaging/invalid-registration-token',
              'messaging/registration-token-not-registered',
            ];
            if (code && invalidCodes.includes(code)) {
              invalidTokens.push(chunk[idx]);
            }
          }
        });
      } catch (err: any) {
        this.logger.error(`FCM multicast failed: ${err?.message ?? err}`);
      }
    }

    return invalidTokens;
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
