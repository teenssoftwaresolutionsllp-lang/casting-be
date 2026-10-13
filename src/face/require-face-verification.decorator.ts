import { SetMetadata } from '@nestjs/common';

export const FACE_VERIFICATION_PURPOSE = 'faceVerificationPurpose';

export const RequireFaceVerification = (purpose: string) =>
  SetMetadata(FACE_VERIFICATION_PURPOSE, purpose);
