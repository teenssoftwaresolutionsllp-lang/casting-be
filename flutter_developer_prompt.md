# Flutter Developer Prompt — FCM Push Notifications (Casting App)

## Project Context
App name: **Casting** (talent casting platform)  
Firebase Project: `casting-29490`  
Package name (Android): `com.example.aicc` / `talentcasting.com`  
Bundle ID (iOS): `com.example.aicc`

---

## Your Job
Implement Firebase Cloud Messaging (FCM) push notifications in the Flutter app.  
The **backend already handles all event triggers and FCM delivery**.  
Your job is:
1. Initialize Firebase + FCM in Flutter  
2. Register the FCM token with the backend on every app launch / token refresh  
3. Handle incoming notifications in **foreground, background, and terminated** states  
4. Parse the notification payload and **navigate to the correct screen** based on `type`, `entityType`, and `entityId`  
5. Show a local notification banner when the app is in the **foreground** (FCM does not auto-display in foreground)  
6. Clear the FCM token from the backend on **logout**

---

## Firebase Configuration Files (Already Provided)

- **Android**: Place `google-services.json` in `android/app/`
- **iOS**: Place `GoogleService-Info.plist` in `ios/Runner/`

Both files are already provided by the backend team.

---

## Required Packages

Add to `pubspec.yaml`:

```yaml
dependencies:
  firebase_core: ^3.x.x
  firebase_messaging: ^15.x.x
  flutter_local_notifications: ^17.x.x
```

Also ensure these are in `android/build.gradle` (project level):
```gradle
classpath 'com.google.gms:google-services:4.4.x'
```

And in `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

---

## Backend API Endpoints You Must Call

**Base URL**: `https://casting-be.vercel.app`  
All requests require `Authorization: Bearer <jwt_token>` header.

### 1. Register FCM Token (call on every app start + token refresh)
```
POST /notifications/fcm-token
Content-Type: application/json
Authorization: Bearer <token>

Body: { "token": "<fcm_device_token>" }

Response: { "success": true }
```

### 2. Clear FCM Token (call on logout)
```
DELETE /notifications/fcm-token
Authorization: Bearer <token>

Response: { "success": true }
```

### 3. Get Notifications List
```
GET /notifications?limit=20&offset=0
Authorization: Bearer <token>
```

### 4. Get Unread Count
```
GET /notifications/unread-count
Authorization: Bearer <token>
```

### 5. Mark One as Read
```
POST /notifications/:id/read
Authorization: Bearer <token>
```

### 6. Mark All as Read
```
POST /notifications/read-all
Authorization: Bearer <token>
```

### 7. Delete One
```
DELETE /notifications/:id
Authorization: Bearer <token>
```

### 8. Clear All
```
DELETE /notifications
Authorization: Bearer <token>
```

---

## FCM Notification Payload Structure

Every push notification the backend sends has this structure:

```json
{
  "notification": {
    "title": "New like",
    "body": "Someone liked your post."
  },
  "data": {
    "type": "POST_LIKED",
    "entityType": "VIDEO",
    "entityId": "uuid-of-the-video",
    "actorId": "uuid-of-the-user-who-liked"
  }
}
```

The `data` fields are what you use to navigate. **Always read from `data`, not `notification`**.

---

## All Notification Types + Navigation Map

| `type` | `entityType` | `entityId` | Navigate To |
|--------|-------------|-----------|-------------|
| `POST_LIKED` | `VIDEO` | videoId | Video detail screen |
| `POST_COMMENTED` | `VIDEO` | videoId | Video detail screen (open comments) |
| `COMMENT_LIKED` | `VIDEO` | videoId | Video detail screen |
| `STORY_LIKED` | `STORY` | storyId | Story viewer screen |
| `STORY_REPLIED` | `STORY` | storyId | Story replies screen |
| `NEW_FOLLOWER` | `USER` | followerId (actorId) | Follower's profile screen |
| `NEW_MESSAGE` | `CHAT` | chatId | Chat conversation screen |
| `AUDITION_APPLIED` | `AUDITION` | auditionId | Audition applicants screen |
| `APPLICATION_SHORTLISTED` | `APPLICATION` | applicationId | My applications screen |
| `APPLICATION_ACCEPTED` | `APPLICATION` | applicationId | My applications screen |
| `APPLICATION_REJECTED` | `APPLICATION` | applicationId | My applications screen |
| `APPLICATION_STATUS_UPDATED` | `APPLICATION` | applicationId | My applications screen |
| `AUDITION_CANCELLED` | `AUDITION` | auditionId | Auditions list screen |
| `GENERAL` | *(any)* | *(any)* | Notifications list screen |

---

## Implementation Steps

### Step 1 — Initialize Firebase in `main.dart`

```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

// Top-level background handler — MUST be a top-level function (not inside a class)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // No need to show notification here for data-only messages on Android
  // iOS handles display automatically when app is terminated/background
  _handleNotificationNavigation(message.data, launchedFromTerminated: true);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(MyApp());
}
```

### Step 2 — FCM Setup Service

Create `lib/services/fcm_service.dart`:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';
import '../services/api_service.dart'; // your existing API service

class FcmSetupService {
  static final FlutterLocalNotificationsPlugin _localNotif =
      FlutterLocalNotificationsPlugin();

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'casting_default',           // must match backend channelId
    'Casting Notifications',
    description: 'Push notifications for the Casting app',
    importance: Importance.high,
  );

  /// Call this once after user logs in successfully
  static Future<void> initialize(BuildContext context) async {
    // 1. Request permission (iOS + Android 13+)
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // 2. Set up local notifications plugin for foreground display
    await _localNotif
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    );
    await _localNotif.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        // User tapped a local notification — parse and navigate
        if (response.payload != null) {
          _navigateFromPayload(response.payload!, context);
        }
      },
    );

    // 3. Register token with backend
    await _registerToken();

    // 4. Listen for token refreshes
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      _sendTokenToBackend(newToken);
    });

    // 5. Handle foreground messages (must show local notification manually)
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _showLocalNotification(message);
    });

    // 6. Handle tap when app is in background (not terminated)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationNavigation(message.data, context: context);
    });

    // 7. Handle tap when app was TERMINATED
    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      // Slight delay to let the navigator settle
      Future.delayed(const Duration(milliseconds: 500), () {
        _handleNotificationNavigation(initialMessage.data, context: context);
      });
    }
  }

  static Future<void> _registerToken() async {
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await _sendTokenToBackend(token);
    }
  }

  static Future<void> _sendTokenToBackend(String token) async {
    try {
      await ApiService.post('/notifications/fcm-token', body: {'token': token});
    } catch (e) {
      // Silent fail — will retry on next launch
    }
  }

  /// Call this on user logout
  static Future<void> clearToken() async {
    try {
      await ApiService.delete('/notifications/fcm-token');
    } catch (_) {}
  }

  static void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    final dataPayload = message.data.entries
        .map((e) => '${e.key}=${e.value}')
        .join(',');

    _localNotif.show(
      notification.hashCode,
      notification.title,
      notification.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
        ),
      ),
      payload: dataPayload, // passed to onDidReceiveNotificationResponse
    );
  }

  static void _navigateFromPayload(String payload, BuildContext context) {
    final map = Map.fromEntries(
      payload.split(',').map((e) {
        final kv = e.split('=');
        return MapEntry(kv[0], kv.length > 1 ? kv[1] : '');
      }),
    );
    _handleNotificationNavigation(map, context: context);
  }
}
```

### Step 3 — Navigation Handler

Create `lib/services/notification_navigator.dart`:

```dart
import 'package:flutter/material.dart';
// import your route/screen files here

void _handleNotificationNavigation(
  Map<String, dynamic> data, {
  BuildContext? context,
  bool launchedFromTerminated = false,
}) {
  final type = data['type'] as String? ?? '';
  final entityType = data['entityType'] as String? ?? '';
  final entityId = data['entityId'] as String? ?? '';
  final actorId = data['actorId'] as String? ?? '';

  if (context == null) {
    // App was terminated — store data and navigate after app loads
    PendingNotification.set(type, entityType, entityId, actorId);
    return;
  }

  _navigate(context, type, entityType, entityId, actorId);
}

void _navigate(
  BuildContext context,
  String type,
  String entityType,
  String entityId,
  String actorId,
) {
  switch (type) {
    case 'POST_LIKED':
    case 'POST_COMMENTED':
    case 'COMMENT_LIKED':
      // Navigate to video detail screen
      Navigator.pushNamed(context, '/video-detail', arguments: {'videoId': entityId});
      break;

    case 'STORY_LIKED':
    case 'STORY_REPLIED':
      // Navigate to story viewer
      Navigator.pushNamed(context, '/story-viewer', arguments: {'storyId': entityId});
      break;

    case 'NEW_FOLLOWER':
      // Navigate to the follower's profile (actorId = who followed)
      Navigator.pushNamed(context, '/profile', arguments: {'userId': actorId});
      break;

    case 'NEW_MESSAGE':
      // Navigate to chat conversation
      Navigator.pushNamed(context, '/chat', arguments: {'chatId': entityId});
      break;

    case 'AUDITION_APPLIED':
      // Casting director — navigate to audition applicants
      Navigator.pushNamed(context, '/audition-applicants', arguments: {'auditionId': entityId});
      break;

    case 'APPLICATION_SHORTLISTED':
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
    case 'APPLICATION_STATUS_UPDATED':
      // Artist — navigate to my applications
      Navigator.pushNamed(context, '/my-applications', arguments: {'applicationId': entityId});
      break;

    case 'AUDITION_CANCELLED':
    case 'AUDITION_UPDATED':
      // Navigate to auditions list
      Navigator.pushNamed(context, '/auditions');
      break;

    default:
      // Fallback — open notifications list
      Navigator.pushNamed(context, '/notifications');
  }
}

/// Stores a pending notification for when app launches from terminated state
class PendingNotification {
  static String? _type;
  static String? _entityType;
  static String? _entityId;
  static String? _actorId;

  static void set(String type, String entityType, String entityId, String actorId) {
    _type = type;
    _entityType = entityType;
    _entityId = entityId;
    _actorId = actorId;
  }

  static bool get hasPending => _type != null;

  static void consumeAndNavigate(BuildContext context) {
    if (_type == null) return;
    _navigate(context, _type!, _entityType ?? '', _entityId ?? '', _actorId ?? '');
    _type = null;
    _entityType = null;
    _entityId = null;
    _actorId = null;
  }
}
```

### Step 4 — Wire Into App

In your main widget / home screen `initState`:

```dart
@override
void initState() {
  super.initState();
  WidgetsBinding.instance.addPostFrameCallback((_) {
    // After login succeeds:
    FcmSetupService.initialize(context);

    // If launched from terminated state:
    if (PendingNotification.hasPending) {
      PendingNotification.consumeAndNavigate(context);
    }
  });
}
```

### Step 5 — On Logout

```dart
await FcmSetupService.clearToken();
// then clear your local JWT / session
```

---

## iOS Specific Setup

### In `ios/Runner/AppDelegate.swift`:
```swift
import UIKit
import Flutter
import Firebase

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    FirebaseApp.configure()
    // Required for background FCM on iOS
    UNUserNotificationCenter.current().delegate = self
    application.registerForRemoteNotifications()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
```

### In `ios/Runner/Info.plist` add:
```xml
<key>FirebaseMessagingAutoInitEnabled</key>
<true/>
```

### APNs (iOS Push) — Required
- Upload APNs `.p8` auth key in Firebase Console → Project Settings → Cloud Messaging → iOS app
- The backend team already has the Firebase project configured — ask them for the APNs key status

---

## Android Specific Setup

### `android/app/src/main/AndroidManifest.xml` — add inside `<application>`:
```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="casting_default" />

<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@mipmap/ic_launcher" />
```

---

## Notification Icon (Android)
Make sure `@mipmap/ic_launcher` exists. Optionally create a dedicated notification icon at `android/app/src/main/res/drawable/ic_notification.png` (white, transparent background, 24dp).

---

## Testing Checklist

- [ ] App receives notification when **foreground** — local banner shown
- [ ] App receives notification when **background** — system tray shown, tap opens correct screen
- [ ] App receives notification when **terminated** — tap launches app, navigates to correct screen
- [ ] FCM token is registered with backend after login
- [ ] FCM token is cleared from backend after logout
- [ ] Each notification type navigates to the correct screen
- [ ] Unread badge count reflects `/notifications/unread-count`
- [ ] Marking notification as read calls `POST /notifications/:id/read`

---

## Notes for the Flutter Developer

1. **Don't send FCM directly from Flutter** — the backend handles all FCM delivery. Flutter only registers the token and listens.
2. **Token can change** — always listen to `onTokenRefresh` and re-register.
3. **Never hardcode the token** — always fetch fresh from `FirebaseMessaging.instance.getToken()`.
4. **iOS requires real device** — FCM does not work on iOS simulators.
5. **Data-only vs notification messages** — the backend sends both `notification` + `data` fields. On Android in background, the system shows the notification automatically. On foreground you must show it manually (Step 2 handles this).
6. **`casting_default` channel ID** — this must match exactly what the backend sets (`channelId: 'casting_default'` in the Android config).
