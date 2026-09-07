import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App | null = null;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.firebaseApp = existingApps[0]!;
      return;
    }

    try {
      const configPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'firebase-service-account.json';
      const serviceAccountPath = path.resolve(process.cwd(), configPath);
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);

        this.firebaseApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || 'casting-29490',
        });
        this.logger.log('Firebase Admin initialized from service account file.');
        return;
      }

      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID || 'casting-29490',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
          projectId: process.env.FIREBASE_PROJECT_ID || 'casting-29490',
        });
        this.logger.log('Firebase Admin initialized from environment variables.');
        return;
      }

      this.logger.warn(
        'No Firebase service account found. Google token verification will not function until credentials are configured.',
      );
    } catch (err: any) {
      this.logger.error('Failed to initialize Firebase Admin SDK', err.stack);
    }
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!getApps().length) {
      this.initializeFirebase();
    }

    try {
      const auth = getAuth(this.firebaseApp || undefined);
      return await auth.verifyIdToken(idToken);
    } catch (error: any) {
      this.logger.warn('Firebase ID token verification failed: ' + (error?.message || error));
      throw new UnauthorizedException('Invalid or expired Google ID token.');
    }
  }
}

