# CalendarApp

A React Native **0.85.3** (bare CLI, **no Expo**) calendar application with Firebase Authentication & Firestore on the **modular `firebase-js-sdk`-style API**, shared **participant invites** ( **`participantIds` + collection-group merge** ), an animated **splash** on cold start, a fully **hand-rolled** monthly calendar grid, react-hook-form + Zod, and feature-sliced **Zustand v5** with granular selectors for minimal re-renders.

### Stack at a glance

| Layer | Version |
|---|---|
| React Native | **0.85.3** (New Architecture, Bridgeless — required since 0.83) |
| React | **19.2.3** |
| Node | **≥ 20.19.4** (Active LTS) |
| TypeScript | **5.9.2** |
| State | **Zustand 5** (curried `create<T>()(…)` form) |
| Animations | **Reanimated 4** + **react-native-worklets** (babel plugin moved to `react-native-worklets/plugin`) |
| Navigation | **React Navigation v7** (`react-native-screens` v4 required by native-stack) |
| Firebase | **@react-native-firebase 24** — modular API (`getAuth`, `getFirestore`, `writeBatch`, `increment`, …) |
| Forms | react-hook-form 7 + zod 3 |
| Secure quick login | **`react-native-keychain`** — see **`src/services/biometric-login.service.ts`** |

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

After a successful email/password sign-in, the app can offer to save credentials in **`react-native-keychain`**, guarded by **`BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE`** (biometrics or device PIN). **Retrieval passes the same `accessControl`** as storage so Android resolves the Keystore biometric flow correctly (`getGenericPassword` / `setGenericPassword`). **Signing out clears the Firebase session only** — the encrypted quick-login entry persists so you can use biometrics again on the Sign In screen. It is cleared when **`applyProfileUpdates`** changes your **password**, or when the user wipes app data / uninstalls. **`NSFaceIDUsageDescription`** is in **`ios/CalendarApp/Info.plist`** (run **`pod install`** after adding **`react-native-keychain`**).

### Firestore data model (`users/{uid}/meetings`)

- Path: **`users/{userId}/meetings/{meetingId}`**
- Implemented in **`src/services/firebase/meetings.service.ts`** (`meetingsCol(uid)`).
- **`participantIds`** lists invited attendee Auth UIDs; display names/emails are loaded on demand (**`fetchMeetingUserDisplayBundle`**) rather than duplicated on each meeting doc.
- **Default (non-admin) calendar** merges (**`subscribeOwnMeetingsMergedWithParticipantInvites`**): (**1**) organizer subcollection via **`subscribeAll`**, (**2**) collection-group **`array-contains`** on **`participantIds`** for meetings hosted by someone else where you’re invited. Rows are merged, deduped by **`ownerId:id`**, with invited snapshots sorted by **`startsAt` in-memory** so a composite **`(participantIds, startsAt)`** index isn’t required.
- **Participant listener errors no longer wipe the cached invite list** before reconnect (avoids flashing empty calendars on transient failures).
- **After a successful meeting `update`,** **`actions.refresh()`** rewires Firestore listeners so indexes and merged views stay authoritative (date moves, invites, stale collection-group cache, etc.).
- **Admin calendar toggle:** **`users/{uid}.role == "admin"`** can enable **All organizers** on Calendar — **`collectionGroup("meetings")`** via **`subscribeMeetingsAcrossAllUsers`**. Needs the **`startsAt`** index below.

### Firestore indexes

Deploy **`firestore.indexes.json`** (`firebase deploy --only firestore:indexes` or mirror entries in Console):

| Config | Purpose |
|--------|---------|
| Collection group **`meetings`**, **`startsAt`** ascending | Admin global calendar **`orderBy('startsAt')`**. |
| Field override **`participantIds`** · **`COLLECTION_GROUP`** · **`CONTAINS`** | Enables **`participantIds` array-contains** on the **`meetings`** collection group without a composite with **`startsAt`**. |

The calendar grid badges days using each doc’s **`dateISO`** field.

Security rules scoped only to a **root-level** **`meetings/{meetingId}`** collection **do not** apply to **`users/.../meetings/...`**, so misplaced rules produce **`permission-denied`**. Rules **must** allow invited users to **`read`** a host doc when **`request.auth.uid`** is in **`resource.data.participantIds`** — see **`firestore.rules`** in-repo.

Paste the canonical rules snippet below into Firebase Console → **Firestore Database → Rules** (or deploy **`firestore.rules`** via Firebase CLI).

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    //
    // This app stores meetings UNDER each user doc:
    //   users/{userId}/meetings/{meetingId}
    // (see src/services/firebase/meetings.service.ts)
    //
    // Rules scoped only to "/meetings/{meetingId}" at the DATABASE ROOT
    // do NOT apply to subcollections and will produce permission-denied.
    //

    function userRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role;
    }

    /** Role is mirrored on Firestore users/{uid}.role (NOT Auth custom claims here). */
    function isSignedInAdmin() {
      return request.auth != null
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && userRole(request.auth.uid) == 'admin';
    }

    match /users/{userId} {
      /** Organizers assign participants via a picker that reads display names/emails across users. */
      allow read: if request.auth != null;

      /** Profile bootstrap + normal merges — only yourself. */
      allow create: if request.auth != null && request.auth.uid == userId;

      /**
       * Stats/counters merged from meeting batches (`stats.meetings*`) live on this doc.
       * Organizers update their own profile; admins need update when fixing another user's
       * meetings (same batch touches `meetings/` + stats here), which `allow write: self only`
       * incorrectly blocked (`permission-denied` on the whole batch).
       */
      allow update: if request.auth != null
        && (request.auth.uid == userId || isSignedInAdmin());

      /** Optional: callers may delete own user root doc; admins do not wipe profiles via app. */
      allow delete: if request.auth != null && request.auth.uid == userId;

      match /meetings/{meetingId} {

        allow read: if request.auth != null
          && (
            request.auth.uid == userId
            || isSignedInAdmin()
            || (
              resource.data.participantIds is list
              && resource.data.participantIds.hasAny([request.auth.uid])
            )
          );

        // Create meeting doc (batch also updates parent user stats — handled above)
        allow create: if request.auth != null
          && request.auth.uid == userId
          && request.resource.data.ownerId == request.auth.uid
          && request.resource.data.id == meetingId
          && request.resource.data.startsAt != null
          && request.resource.data.endsAt != null
          && request.resource.data.endsAt > request.resource.data.startsAt;

        allow update: if request.auth != null
          && (
            (
              request.auth.uid == userId
              && resource.data.ownerId == request.auth.uid
              && request.resource.data.ownerId == request.auth.uid
              && request.resource.data.endsAt > request.resource.data.startsAt
            )
            || (
              isSignedInAdmin()
              && resource.data.ownerId == userId
              && request.resource.data.ownerId == resource.data.ownerId
              && request.resource.data.endsAt > request.resource.data.startsAt
            )
          );

        allow delete: if request.auth != null
          && (
            (request.auth.uid == userId && resource.data.ownerId == request.auth.uid)
            || (isSignedInAdmin() && resource.data.ownerId == userId)
          );
      }
    }

    //
    // If you later ADD a TOP-LEVEL /meetings/{meetingId} collection (sharing,
    // org-wide calendar, etc.), define that match HERE with its own rules.
    //
  }
}

```

---

## 3. Run

```bash
npm start         # metro
npm run android   # or npm run ios
```

---

## 4. Architecture

```
src/
├── app/                       App entry, navigation, bootstrap
│   ├── Root.tsx
│   ├── components/SplashGate.tsx  # Animated cold-start overlay (until auth settles)
│   ├── hooks/useAppBootstrap.ts   # Firebase auth listener + meetings bind by uid
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
│       └── meetings.selectors.ts  # useMeetingsForDay, useAllUpcomingMeetings, …
├── services/
│   ├── firebase/              Auth, Firestore (meetings, users)
│   └── biometric-login.service.ts
└── types/                     Cross-cutting domain types
```

### State management principles (Zustand)

- **Module-scoped stores** — no providers needed. `useAuthStore` and `useMeetingsStore` are imported directly wherever needed.
- **Granular selectors** — every consumer uses a tiny, single-field selector (`useAuthStore(s => s.busy)`, `useMeetingsStore(s => s.byDate)`, etc.) exposed as named hooks in `*.selectors.ts`. React only re-renders when that exact slice's reference changes.
- **Stable `actions` slot** — both stores expose all callbacks under a nested `actions: {…}` object set once at store creation. `useAuthActions()` / `useMeetingsActions()` consumers therefore never re-render after first mount, the same property a split state/dispatch context pattern would give you.
- **Internal mutators are namespaced** — the meetings store separates the public `actions` (create/update/delete) from `internal` mutators (`_hydrateMeetings`, `_setError`, `_reset`) so feature code cannot accidentally bypass Firestore.
- **Side-effect bridge** — `useAppBootstrap()` runs once at app start: it kicks off the Firebase auth listener and watches the user's uid; when the uid changes it calls `bindMeetingsToUser(uid)`, which (un)subscribes the Firestore listeners that pump data into the meetings store. Single source of truth for per-user lifecycle.
- **`meetingsInitialHydrated`** — **`false`** until the active subscription’s first **`_hydrateMeetings`** completes; Calendar uses it for a dedicated first-load spinner (authenticated users don’t stare at an empty grid while Firestore attaches).
- **Derived data is memoized** — selectors expose stable shapes via `useMemo` (`useMeetingsForDay`, **`useMeetingStats`**, **`useUpcomingMeetings(limit)`**, **`useAllUpcomingMeetings`** for the unpaged list). **`useMeetingStats().upcoming`** counts all future meetings involving the user; the Profile preview lists them in pages of five with **Previous / Next**.
- **Pull / refresh** — **`useMeetingsActions().refresh`** forces a listener rewind (manual refresh and post-edit hydration).

### Custom Calendar

`useCalendarMatrix(year, month)` returns a typed `6×7` matrix of day cells (with `inCurrentMonth`, `isToday`, `dateISO`). The grid is pure RN `<View>` flexbox — no calendar libraries. Participant-assigned meetings use the **`dateISO`** field for day badges (keep it aligned with **`startsAt`** when editing).

### Forms & Validation

`react-hook-form` + `@hookform/resolvers/zod`. Meeting create/update validates **`title`**, **`endTime` after `startTime`**, **same-day overlaps**, and can assign **`participantIds`** (picker reads the users directory scoped by **`firestore.rules`**).

### Animations

- `react-native-reanimated` — bottom-tab indicator, **`SplashGate`** staged entrance + dissolve once auth is ready (minimum dwell ~2s), and shared **`useFadeIn`** for screen fades.
- Native-stack **`animation: 'slide_from_right'`** + **`animationDuration`** in `transitions.ts`.

### Repo hygiene

**.gitignore** excludes common regenerated native artefacts (`**/.cxx/`, Ninja/CMake noise, Gradle caches — see `.gitignore` for the authoritative list).

### Tests / quality gates

```bash
npm run tsc       # typecheck (no emit)
npm test          # Jest
npm run lint      # ESLint
```
