# CalendarApp

A senior-grade React Native **0.85.3** (bare CLI, **no Expo**) calendar application with Firebase Authentication & Firestore on the **modular `firebase-js-sdk`-style API**, a fully **hand-rolled** monthly calendar grid, react-hook-form + Zod, and a feature-sliced architecture built around **Zustand v5** stores with granular selector subscriptions for minimal re-renders.

### Stack at a glance

| Layer | Version |
|---|---|
| React Native | **0.85.3** (New Architecture, Bridgeless — required since 0.83) |
| React | **19.2.0** |
| Node | **≥ 20.19.4** (Active LTS) |
| TypeScript | **5.9.2** |
| State | **Zustand 5** (curried `create<T>()(…)` form) |
| Animations | **Reanimated 4** + **react-native-worklets** (babel plugin moved to `react-native-worklets/plugin`) |
| Navigation | **React Navigation v7** (`react-native-screens` v4 required by native-stack) |
| Firebase | **@react-native-firebase 24** — modular API (`getAuth`, `getFirestore`, `writeBatch`, `increment`, …) |
| Forms | react-hook-form 7 + zod 3 |

---

## 1. One-time native bootstrap

This repo ships application source only (`src/`, `App.tsx`, `index.js`, configs). The native `android/` and `ios/` folders are generated locally with the official community CLI:

```bash
# Generate a temporary RN 0.85.3 template, then move only the native folders
npx @react-native-community/cli@latest init CalendarApp \
  --version 0.85.3 --skip-install --directory _tmp

mv _tmp/android ./android
mv _tmp/ios ./ios
rm -rf _tmp
```

Then install JS deps:

```bash
npm install
# iOS only
cd ios && bundle install && bundle exec pod install && cd ..
```

> The `package.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `App.tsx` and `index.js` shipped in this repo are already wired for RN 0.85.3 + Reanimated 4 + Zustand 5 + path aliases, so the move above is all you need.
>
> **Node:** RN 0.85 dropped support for Node < 20.19.4 (and EOL Node 21/23). Run `node -v` first; install Node 22 LTS if you're behind.

> **Android Studio / Gradle:** the JVM Gradle uses often skips NVM/FNM `PATH`. Root `android/build.gradle` sets `REACT_NATIVE_NODE_MODULES_DIR` (so some tooling can resolve `react-native` without spawning `node` during configure) and `NODE_EXECUTABLE` from `android/local.properties` (`nodejs.executable`) or `NODE_BINARY`. If third-party libraries still invoke `node` and sync fails, point `nodejs.executable` at an absolute path to your Node binary.
---

## 2. Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Enable **Authentication → Email/Password**.
3. Enable **Firestore Database** (production or test mode).
4. Download `google-services.json` → place in **`android/app/`**. The project uses the **`com.google.gms.google-services`** plugin (classpath **4.4.4** in `android/build.gradle`); `:app` applies it **only when** that file exists, so Gradle can still compile for contributors who have not added Firebase yet — **Firebase in the running app requires the JSON file** (matching your Android `applicationId`).
5. Download `GoogleService-Info.plist` → place in `ios/CalendarApp/`.
6. Follow the platform-specific instructions for `@react-native-firebase/app`:
   - Android: <https://rnfirebase.io/#2-android-setup>
   - iOS: <https://rnfirebase.io/#3-ios-setup>

### Android signup: `CONFIGURATION_NOT_FOUND` / `RecaptchaCallWrapper`

Email/password still relies on Firebase’s Android/recaptcha safeguards. Logcat **`CONFIGURATION_NOT_FOUND`** with **`signUpPassword`** usually means the Android app in Firebase Console has **no SHA certificate fingerprints** registered, so **`google-services.json` keeps `"oauth_client": []`** and the SDK cannot finish auth setup.

Fix:

1. Firebase Console → **Project settings** → your Android app (package **`com.calendarapp`** must equal **`applicationId`** in Gradle).
2. Add **SHA-1** and **SHA-256** for each keystore you use (debug for local builds, release for store builds). RN default debug keystore:
   ```bash
   keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
3. Download a **new** `google-services.json` → **`android/app/`**. After fingerprints are saved, **`oauth_client`** should not stay empty.
4. Reinstall the app (clean build if needed).

Confirm **Authentication → Sign-in methods → Email/Password** is enabled and Google Play services is current on the device.

### Biometric quick sign-in (Face ID / Touch ID / fingerprint)

After a successful email/password sign-in, the app can offer to save credentials in **`react-native-keychain`**, guarded by **`BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`** (biometrics or device PIN). **Signing out clears the Firebase session only** — the encrypted quick-login blob stays until the password changes in profile (**`applyProfileUpdates`**) or the user wipes app data / uninstalls. **`NSFaceIDUsageDescription`** is set in **`ios/CalendarApp/Info.plist`**; rebuild iOS (**`pod install`**) after adding **`react-native-keychain`**.

Firestore stores meetings **under each signed-in user**:

- Path: **`users/{userId}/meetings/{meetingId}`**
- Implemented in **`src/services/firebase/meetings.service.ts`** (`meetingsCol(uid)`).
- **Admin calendar toggle:** Users with **`users/{uid}.role == "admin"`** in Firestore can turn on **All organizers** on the Calendar tab. That listens to **every** organizer’s bookings via **`collectionGroup("meetings")`** (`subscribeMeetingsAcrossAllUsers`). Deploy the composite index from **`firestore.indexes.json`** (or follow the Firebase Console URL printed on first listener failure): collection group **`meetings`**, field **`startsAt`** ascending. **Rules** must let admins read other users’ meeting subcollections—the checked-in **`firestore.rules`** includes that pattern alongside normal self-only reads.

Security rules scoped only to a **top-level** collection **`meetings/{meetingId}`** do **not** apply to **`users/.../meetings/...`**, so writes will fail with **`permission-denied`**.

Paste the canonical rules below into Firebase Console → **Firestore Database → Rules** (or deploy the checked-in **`firestore.rules`** via Firebase CLI). They nest **`meetings`** under **`users`**, optionally with stricter `create`/`update` checks aligned with app fields (`ownerId`, `id`, `startsAt`, `endsAt`).

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /meetings/{meetingId} {
        allow read: if request.auth != null && request.auth.uid == userId;

        allow create: if request.auth != null
          && request.auth.uid == userId
          && request.resource.data.ownerId == request.auth.uid
          && request.resource.data.id == meetingId
          && request.resource.data.startsAt != null
          && request.resource.data.endsAt != null
          && request.resource.data.endsAt > request.resource.data.startsAt;

        allow update: if request.auth != null
          && request.auth.uid == userId
          && resource.data.ownerId == request.auth.uid
          && request.resource.data.ownerId == request.auth.uid
          && request.resource.data.endsAt > request.resource.data.startsAt;

        allow delete: if request.auth != null
          && request.auth.uid == userId
          && resource.data.ownerId == request.auth.uid;
      }
    }
  }
}
```

For a permissive MVP (fewer validations), **`allow read, write` on `/users/{userId}` and nested `/meetings/{meetingId}`** only when **`request.auth.uid == userId`** is enough — see **`firestore.rules`** in the repo comments for variations.

---

## 3. Run

```bash
npm run android   # or npm run ios
npm start         # metro
```

---

## 4. Architecture

```
src/
├── app/                       App entry, navigation, bootstrap
│   ├── Root.tsx
│   ├── hooks/useAppBootstrap.ts   # Wires Firebase listeners → Zustand
│   ├── providers/AppProviders.tsx # SafeArea + GestureHandler + NavContainer
│   └── navigation/
│       ├── RootNavigator.tsx
│       ├── AuthStack.tsx
│       ├── MainTabs.tsx
│       ├── transitions.ts
│       └── types.ts
├── features/                  Vertical feature slices
│   ├── auth/
│   │   ├── components/  hooks/  schemas/  screens/
│   ├── calendar/
│   │   ├── components/  hooks/  schemas/  utils/  screens/
│   └── profile/
│       ├── components/  hooks/  screens/
├── shared/                    Cross-feature primitives
│   ├── components/            Header, BottomTabBar, Button, TextField, …
│   ├── hooks/
│   ├── theme/                 colors, spacing, typography, radius
│   └── utils/                 date/time helpers
├── store/                     Zustand stores (module-scoped, no providers)
│   ├── auth/
│   │   ├── auth.types.ts          # AuthSlice, AuthActions, AuthStatus
│   │   ├── auth.store.ts          # create() + initAuthListener()
│   │   └── auth.selectors.ts      # useAuthUser, useAuthStatus, useAuthActions, …
│   └── meetings/
│       ├── meetings.types.ts
│       ├── meetings.store.ts      # create() + bindMeetingsToUser(uid)
│       └── meetings.selectors.ts  # useMeetingsForDay, useMeetingStats, …
├── services/firebase/         Thin wrappers over @react-native-firebase
└── types/                     Cross-cutting domain types
```

### State management principles (Zustand)

- **Module-scoped stores** — no providers needed. `useAuthStore` and `useMeetingsStore` are imported directly wherever needed.
- **Granular selectors** — every consumer uses a tiny, single-field selector (`useAuthStore(s => s.busy)`, `useMeetingsStore(s => s.byDate)`, etc.) exposed as named hooks in `*.selectors.ts`. React only re-renders when that exact slice's reference changes.
- **Stable `actions` slot** — both stores expose all callbacks under a nested `actions: {…}` object set once at store creation. `useAuthActions()` / `useMeetingsActions()` consumers therefore never re-render after first mount, the same property a split state/dispatch context pattern would give you.
- **Internal mutators are namespaced** — the meetings store separates the public `actions` (create/update/delete) from `internal` mutators (`_hydrateMeetings`, `_setError`, `_reset`) so feature code cannot accidentally bypass Firestore.
- **Side-effect bridge** — `useAppBootstrap()` runs once at app start: it kicks off the Firebase auth listener and watches the user's uid; when the uid changes it calls `bindMeetingsToUser(uid)`, which (un)subscribes the Firestore listeners that pump data into the meetings store. Single source of truth for per-user lifecycle.
- **Derived data is memoized** — selectors return raw store slices; computed views (`useUpcomingMeetings`, `useMeetingStats`) wrap them in `useMemo` so derived arrays/objects keep stable references between renders.

### Custom Calendar

`useCalendarMatrix(year, month)` returns a typed `6×7` matrix of day cells (with `inCurrentMonth`, `isToday`, `dateISO`). The grid is pure RN `<View>` flexbox — no calendar libraries.

### Forms & Validation

`react-hook-form` + `@hookform/resolvers/zod`. The create-meeting flow validates:
- `title` length
- `endTime` strictly after `startTime`
- **No overlap** with existing same-day meetings (passed into the resolver via Zod `superRefine`).

### Animations

- `react-native-reanimated` for animated bottom-tab indicator and fade/slide screen entries.
- Native-stack `animation: 'slide_from_right'` + `animationDuration` configured in `transitions.ts`.
