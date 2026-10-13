# Face Verification

This document describes the face-verification feature currently implemented in
this backend. It is an optional second factor layered on top of the existing
JWT authentication. Face embeddings are supplied by the client; the backend
does not run a face-recognition model or call an external recognition service.
No AWS services are used.

## Setup

Configure these environment variables before using enrollment or verification:

| Variable | Purpose |
| --- | --- |
| `FACE_ENCRYPTION_KEYS` | JSON object mapping key versions to Base64-encoded AES keys. Every key must decode to exactly 32 bytes. |
| `FACE_ENCRYPTION_KEY_VERSION` | Integer version of the key used for new templates. |
| `FACE_EMBEDDING_LENGTH` | Exact vector length produced by the client-side recognition model. |
| `FACE_DISTANCE_THRESHOLD` | Maximum accepted Euclidean distance between embeddings. |

Example configuration (replace the placeholder with a securely generated,
secret 32-byte key encoded as Base64; do not commit real keys):

```env
FACE_ENCRYPTION_KEYS={"1":"<base64-encoded-32-byte-key>"}
FACE_ENCRYPTION_KEY_VERSION=1
FACE_EMBEDDING_LENGTH=512
FACE_DISTANCE_THRESHOLD=0.6
```

Keep old encryption keys in `FACE_ENCRYPTION_KEYS` while templates encrypted
with those key versions remain. Increment `FACE_ENCRYPTION_KEY_VERSION` when
rotating keys. The embedding size and distance threshold must be calibrated to
the exact model and preprocessing used by the client.

The Drizzle migration is
[`src/db/migrations/0002_purple_the_santerians.sql`](./src/db/migrations/0002_purple_the_santerians.sql).
Apply it using the repository migration command:

```sh
npm run migrate
```

## API

Every endpoint requires the normal bearer JWT:

```http
Authorization: Bearer <JWT>
```

### Record consent

```http
POST /face/consent
Content-Type: application/json

{ "version": "biometric-consent-v1" }
```

Records the consent version and acceptance time for the authenticated user.
Enrollment is rejected unless a consent record exists.

### Enroll a template

```http
POST /face/enroll
Content-Type: application/json

{
  "embedding": [0.12, -0.08, 0.31],
  "modelVersion": "recognition-model-v1",
  "sampleCount": 3
}
```

The embedding must contain finite numbers and have exactly
`FACE_EMBEDDING_LENGTH` elements. A recent authentication is required: the
bearer JWT's `iat` must be no more than five minutes old. This repository does
not currently have a separate password re-authentication endpoint, so the
current implementation uses JWT issue time for this check. Enrollment requires
recorded biometric consent.

The embedding is encrypted server-side with AES-256-GCM. Ciphertext, IV,
authentication tag, key version, and model version are stored; plaintext
embeddings are not logged. Re-enrolling replaces the active template for that
user by revoking the previous active row and inserting a new one. `sampleCount`
is validated but is not used to aggregate or validate multiple samples.

Successful response:

```json
{ "enrolled": true, "modelVersion": "recognition-model-v1" }
```

### Create a challenge

```http
POST /face/challenge
Content-Type: application/json

{ "purpose": "manage-account" }
```

Successful response:

```json
{
  "challengeId": "uuid",
  "expiresAt": "2026-10-12T06:30:00.000Z"
}
```

The challenge is associated with the authenticated user and requested purpose.
Its server-managed nonce is single-use and expires after 60 seconds. The nonce
itself is not returned to the client; the client submits the challenge ID.

### Verify a face

```http
POST /face/verify
Content-Type: application/json

{
  "challengeId": "uuid",
  "embedding": [0.12, -0.08, 0.31],
  "livenessPassed": true,
  "deviceId": "optional-device-id"
}
```

The embedding must have the configured length. The server atomically consumes
the user's unexpired, unused challenge, decrypts the active template, computes
Euclidean distance, and accepts when the distance is less than or equal to
`FACE_DISTANCE_THRESHOLD`. A successful response contains a five-minute
face-verification JWT:

```json
{ "faceToken": "<JWT>", "expiresIn": 300 }
```

The face token contains `fv: true`, the authenticated user's `sub`, and the
challenge's `purpose`. It must be used with the same authenticated account and
the same purpose.

### Check status

```http
GET /face/status
```

Returns whether the authenticated user has an active template and the latest
consent version and acceptance time. It does not return a template or
embedding.

### Delete enrollment

```http
DELETE /face/enroll
```

Hard-deletes the authenticated user's stored face templates and writes a
`FACE_TEMPLATE_DELETED` activity-log entry. Returns
`{ "deleted": true }` when a template was deleted. It does not delete consent
or verification-attempt records.

## Protecting another route

Exported `FaceVerifiedGuard` and `@RequireFaceVerification(purpose)` are in
`src/face/`. Use them on routes that already require normal JWT authentication.
JWT authentication must run first so `request.user` is available to the face
guard:

```ts
@UseGuards(JwtAuthGuard, RolesGuard, FaceVerifiedGuard)
@RequireFaceVerification('manage-account')
@Delete('sensitive-action')
async sensitiveAction() {
  // ...
}
```

`RolesGuard` above is an example placeholder for the application's role guard;
this repository currently has no general-purpose roles guard. The exported
face guard can be combined with whichever role guard is used by the consuming
route. Clients send the returned token as:

```http
X-Face-Token: <faceToken>
```

Missing, invalid, expired, wrong-purpose, or wrong-user face tokens are
rejected with `FACE_VERIFICATION_REQUIRED`.

## Limits and errors

- Verification is limited to 10 attempts per user and IP in a rolling
  60-second window. The limit counts attempts recorded in `face_attempts`.
- Five consecutive failed verification attempts lock further verification for
  15 minutes. The fifth failure is recorded as failed; subsequent verification
  while locked returns `FACE_LOCKED`.
- Challenges cannot be used twice and cannot be used after expiry.
- `FACE_NOT_ENROLLED`: there is no active face template.
- `FACE_MISMATCH`: measured distance exceeds the configured threshold.
- `LIVENESS_FAILED`: the request's `livenessPassed` value is false.
- `CHALLENGE_EXPIRED`: the challenge is missing, expired, already consumed, or
  does not belong to the authenticated user.
- `FACE_LOCKED`: verification is temporarily locked following consecutive
  failed attempts.
- Other validation/configuration failures use codes such as
  `INVALID_FACE_EMBEDDING`, `FACE_REAUTH_REQUIRED`,
  `FACE_CONFIGURATION_UNAVAILABLE`, and `FACE_RATE_LIMITED`.

Attempts store result, distance-derived similarity score, liveness flag,
device ID, IP, purpose, and timestamp. Embeddings and decrypted/encrypted
templates are not included in application logs or attempt records.

## Important liveness limitation

`livenessPassed` is a client-provided boolean. The backend rejects `false`, but
does not independently prove that the client performed liveness detection or
that the embedding came from a live person. Do not treat this check as
server-verified liveness in an untrusted-client threat model. Production
deployments needing that assurance must add a trustworthy, server-verifiable
liveness or device-attestation mechanism.
