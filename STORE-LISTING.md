# Telelume - App Store / Play Store Submission Pack

Everything you copy-paste into App Store Connect and Google Play Console.
All copy uses hyphens only (no en/em dashes). Character limits noted per field.

---

## 1. Core identity

- **App name:** Telelume
- **Bundle ID (iOS) / Package (Android):** com.markcmo.prompterly
- **Version:** 1.0.0
- **Primary category:** Photo & Video
- **Secondary category:** Productivity
- **Age rating:** 4+ (no objectionable content)
- **Price:** Free

---

## 2. App Store Connect (iOS) text fields

### App Name (max 30 chars)
```
Telelume
```

### Subtitle (max 30 chars)
```
Read your script on camera
```
(26 chars)

### Promotional Text (max 170 chars - editable anytime without review)
```
Turn your phone into a teleprompter. Write your script, hit record, and read it straight off the screen while you film. Everything stays on your device.
```
(151 chars)

### Keywords (max 100 chars, comma-separated, no spaces after commas)
```
teleprompter,script,prompter,video,recording,creator,influencer,reels,tiktok,youtube,speech,reader
```
(99 chars)

### Description (max 4000 chars)
```
Telelume turns your phone into a professional teleprompter. Write or paste your script, start the camera, and read your words right off the screen while you record - so you stay locked on the lens and never lose your place.

Built for creators, founders, and anyone who films themselves talking. No more memorizing, no more glancing off-camera, no more reshooting take after take.

KEY FEATURES

Read while you record
Your script scrolls smoothly over the live camera preview. Record video and audio at the same time, then save straight to your photo library.

Smooth, adjustable scrolling
Dial in the exact scroll speed that matches how you talk. Fine 60fps scrolling keeps the text buttery and easy to follow.

Make the text yours
Control font size, line height, line spacing, margins, and text color. Pick the look that is easiest for you to read at a glance.

Reading guide
An optional focus line marks exactly where to look, keeping your eyes near the lens for natural eye contact.

Mirror mode
Flip the text horizontally for use with physical teleprompter beam-splitter rigs.

Countdown timer
A 3, 5, or 10 second countdown gives you time to get set before recording starts.

Front or back camera
Film selfie-style or use the rear camera for higher quality footage.

Your script library
Save unlimited scripts on your device. Edit any time with live word and character counts.

Private by design
Telelume has no account and no login. Your scripts are stored on your device. Your recordings are saved to your own photo library. Nothing is uploaded, nothing is tracked, and nothing is sold. Ever.

Whether you are filming Reels, TikToks, YouTube videos, course lessons, sales pitches, or webinar intros, Telelume helps you deliver every line with confidence while looking right down the barrel of the camera.

Download Telelume and shoot your next video in one take.
```

### Support URL
```
https://markcmo.com
```

### Marketing URL (optional)
```
https://markcmo.com
```

### Privacy Policy URL (REQUIRED)
```
https://markcmo.com/telelume-privacy
```

### Copyright
```
2026 WETYR Corp
```

---

## 3. App Privacy questionnaire (App Store Connect > App Privacy)

Answer: **Data Not Collected.**

When prompted "Do you or your third-party partners collect data from this app?" select:
```
No, we do not collect data from this app
```

Justification (true for Telelume v1.0.0):
- No accounts, no login, no backend server.
- Scripts stored locally via on-device storage (AsyncStorage).
- Recordings written to the user's own photo library; never uploaded.
- No analytics, advertising, or third-party tracking SDKs bundled.
- Camera and microphone are used only on-device to produce the recording.

If Apple asks about specific data types (Contact Info, Identifiers, Usage Data,
Diagnostics, etc.) answer **No / Not Collected** for every category.

---

## 4. Google Play Data Safety form (Play Console)

- Does your app collect or share any user data? **No**
- Is all user data encrypted in transit? N/A (no data leaves the device)
- Do you provide a way to request data deletion? **Yes** - users delete scripts
  in-app or uninstall the app; recordings live in the device photo library.
- Privacy Policy URL: `https://markcmo.com/telelume-privacy`

### Play Store listing text

**App title (max 30 chars)**
```
Telelume - Teleprompter
```
(25 chars)

**Short description (max 80 chars)**
```
Read your script on screen while you record video. Private, on-device, no login.
```
(80 chars)

**Full description (max 4000 chars)** - reuse the iOS Description above.

---

## 5. Permission usage strings (already set in app.json)

iOS Info.plist:
- NSCameraUsageDescription: "Telelume uses the camera so you can record yourself while reading your script."
- NSMicrophoneUsageDescription: "Telelume uses the microphone to record audio with your video."
- NSPhotoLibraryAddUsageDescription / NSPhotoLibraryUsageDescription: "Telelume saves your recordings to your photo library."

Android permissions:
- CAMERA, RECORD_AUDIO, READ_MEDIA_VIDEO, WRITE_EXTERNAL_STORAGE

---

## 6. Screenshots still needed (capture from a real device or simulator)

iOS requires screenshots for:
- 6.7" display (iPhone 15/16 Pro Max) - REQUIRED
- 6.5" display (older Pro Max) - recommended
- 5.5" display - optional

Suggested 5 shots:
1. Library screen with a few saved scripts
2. Script editor with the live word/character count
3. Teleprompter recording screen - text scrolling over the camera
4. Settings screen showing font/speed/color controls
5. Reading guide + mirror mode in action

Play Store requires:
- At least 2 phone screenshots (16:9 or 9:16), plus a 1024x500 feature graphic.

---

## 7. What is blocked on Mark (accounts / credentials)

These steps need your logins and cannot be done without them:
1. `npx eas-cli login` (Expo account) - then I run `eas init`.
2. Apple Developer Program enrollment ($99/yr) - hard gate for any iOS install/TestFlight.
3. `eas build --platform ios --profile production`.
4. `eas submit -p ios` then invite yourself as a TestFlight tester.
5. (Free, parallel) Google Play: `eas build --platform android --profile preview`
   produces an APK you can sideload on any Android device for testing with no paid account.
```
