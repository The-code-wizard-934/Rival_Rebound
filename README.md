# 🏆 Rival Rebound — Real-Time Auditorium Quiz Platform

**Rival Rebound** is a live, full-stack quiz competition platform built for auditorium-scale events. It supports Google Sign-In, real-time synchronized gameplay across hundreds of devices, a 2-round competitive format (individual then team-based), a dedicated big-screen display mode for the audience, and a powerful admin control panel — all powered by Firebase and React.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Data Model](#-data-model)
- [Game Flow & Architecture](#-game-flow--architecture)
- [Roles & Permissions](#-roles--permissions)
- [Scoring System](#-scoring-system)
- [Question Types](#-question-types)
- [Admin Dashboard](#-admin-dashboard)
- [Auditorium Display Mode](#-auditorium-display-mode)
- [Student View](#-student-view)
- [Firestore Security Rules](#-firestore-security-rules)
- [Setup and Configuration](#setup-and-configuration)
- [Environment Variables](#-environment-variables)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Known Behaviors & Edge Cases](#-known-behaviors--edge-cases)

---

## 🔭 Overview

Rival Rebound is designed for live events — think college tech fests, company hackathons, or classroom competitions projected on a big screen. Players join via Google Sign-In on their phones, answer questions in real-time, and watch results appear instantly on the shared auditorium display.

The platform runs a **two-round format**:

- **Round 1 — Individual:** All participants compete solo. Scores accumulate and determine who makes the cut.
- **Round 2 — Team Battle:** The top 16 students from Round 1 are automatically shuffled into 4 named teams of 4. The rest of the audience can still participate and vote, but do not earn points. Teams accumulate scores; wrong answers carry a score penalty.

---

## ✨ Features

- **Google OAuth Sign-In** — one-tap login, no passwords
- **Real-time sync** — all players and the admin see state changes instantly via Firestore `onSnapshot` listeners
- **Two-round gameplay** — individual competition followed by team battle
- **Automatic team formation** — top 16 players are shuffled and assigned to 4 elite teams
- **3 question types** — MCQ, Image-based, and Audio-based
- **Time-based scoring** — points scale with how quickly a player answers
- **Score penalty** — wrong answers in Round 2 deduct points
- **Audience poll** — non-team members vote in Round 2; their percentage breakdown is shown on the display after each answer reveal
- **Auditorium Display Mode** — a separate fullscreen-capable view (`?display=true`) for projecting on a big screen
- **Live leaderboard** — top 16 individual and team rankings updated in real-time
- **Admin dashboard** — full game control: add/edit/delete questions, launch questions, transition rounds, view stats, reset game
- **Undo mechanism** — destructive admin actions (clear questions, remove participants) have a 10-second undo window
- **Rank badge** — navbar shows a player's live rank among the top 16
- **Danger Zone** — collapsible section for irreversible game resets with confirmation dialogs

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS v4, `tailwind-merge`, `clsx` |
| Animation | Motion (Framer Motion) |
| Icons | Lucide React |
| Backend / DB | Firebase (Firestore, Auth) |
| Auth Provider | Google OAuth via Firebase |
| Realtime | Firestore `onSnapshot` subscriptions |
| Build tool | Vite |

---

## 📁 Project Structure

```
Rival_Rebound-main/
├── src/
│   ├── App.tsx              # All UI components and views
│   ├── AuthContext.tsx      # Auth state, game state, and user profile provider
│   ├── firebase.ts          # Firebase initialization and error handler
│   ├── types.ts             # TypeScript interfaces for all data models
│   ├── main.tsx             # React app entry point
│   ├── index.css            # Global styles
│   └── lib/
│       └── utils.ts         # Utility: cn() helper for Tailwind class merging
├── firebase-applet-config.json  # Firebase project config (API keys, project ID, etc.)
├── firebase-blueprint.json      # Firestore schema documentation (entities + collections)
├── firestore.rules              # Firestore security rules
├── index.html                   # HTML entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example                 # Template for environment variables
```

---

## 🗄 Data Model

All data lives in **Cloud Firestore**. Here is a full breakdown of every collection.

### `/users/{uid}`

Stores one document per authenticated user.

| Field | Type | Description |
|---|---|---|
| `uid` | `string` | Firebase Auth UID (matches document ID) |
| `email` | `string` | Google account email |
| `displayName` | `string` | User's display name from Google |
| `photoURL` | `string` | Profile photo URL from Google |
| `role` | `'admin' \| 'student'` | Role assigned on first login. Admin email is hardcoded |
| `totalScore` | `number` | Cumulative score across Round 1 and Round 2 |
| `round2Score` | `number` | Score earned in Round 2 only (used for team contribution display) |
| `teamId` | `string \| null` | Team ID assigned during Round 2 transition. `null` for audience members and all players during Round 1 |

### `/game_state/current`

A single document representing the global game state. All clients subscribe to this.

| Field | Type | Description |
|---|---|---|
| `status` | `GameStatus` | One of: `idle`, `question_active`, `showing_results`, `round_transition`, `game_over` |
| `currentQuestionId` | `string \| null` | ID of the currently active question, or null |
| `startTime` | `string \| null` | ISO timestamp when the current question was launched (used for timer calculation) |
| `round` | `number` | Current round number: `1` or `2` |

### `/questions/{id}`

Each document is one quiz question. The document ID is a user-defined string (typically a number like `"1"`, `"2"`, etc.) for natural ordering.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Question ID (same as document ID) |
| `text` | `string` | The question text displayed to players |
| `type` | `'mcq' \| 'image' \| 'audio'` | Question format |
| `options` | `string[]` | Array of 4 answer choices |
| `correctIndex` | `number` | Zero-based index of the correct answer in `options` |
| `mediaUrl` | `string?` | URL to an image or audio file (required for `image` and `audio` types) |
| `points` | `number` | Base points awarded for a correct answer |
| `duration` | `number` | Time limit in seconds |
| `round` | `number` | Which round this question belongs to: `1` or `2` |

### `/responses/{userId}_{questionId}`

One document per player per question. Composite key prevents duplicate submissions.

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | UID of the player who answered |
| `questionId` | `string` | ID of the question answered |
| `selectedIndex` | `number` | Index of the option selected by the player |
| `timeTaken` | `number` | Seconds elapsed between question start and the player's answer |
| `pointsEarned` | `number` | Final points awarded (can be negative in Round 2 for wrong answers) |
| `timestamp` | `string` | ISO timestamp of when the answer was submitted |
| `isAudience` | `boolean` | `true` if the player is in audience mode (not in a team in Round 2) |

### `/teams/{id}`

Created automatically during the Round 1 → Round 2 transition.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Team ID: `team_1`, `team_2`, `team_3`, or `team_4` |
| `name` | `string` | Team name, one of: `CYBER KNIGHTS`, `NEON NINJAS`, `PIXEL PREDATORS`, `CODE CRUSHERS` |
| `memberUids` | `string[]` | Array of 4 player UIDs assigned to this team |
| `totalScore` | `number` | Cumulative team score (incremented/decremented atomically by member responses) |

---

## 🎮 Game Flow & Architecture

### State Machine

The `game_state/current` document drives the entire application. Every client (admin, student, display) subscribes to it and renders accordingly.

```
idle
  │
  ▼ (admin launches a question)
question_active
  │
  ▼ (admin clicks "Show Leaderboard" or timer expires)
showing_results
  │
  ├── (admin launches next question) ──► question_active
  │
  └── (admin clicks "Transition to Round 2") ──► round_transition
        │
        ▼ (teams are formed; admin launches a Round 2 question)
      question_active (round 2)
        │
        ▼
      showing_results (round 2)
```

### Round 2 Transition — Detailed Sequence

The `transitionToRound2()` function follows this exact order to avoid race conditions:

1. **Clear existing `teamId` fields** from all users who previously had one (batch update).
2. **Query top 16 students** by `totalScore` descending.
3. **Shuffle** them randomly.
4. **Create 4 team documents** and assign 4 members each (batch write). This sets `teamId` on each student's user document atomically in the same batch.
5. **Wait 1.5 seconds** — a deliberate buffer to ensure Firestore snapshot listeners on clients have propagated the `teamId` update to their local `profile` before the game state changes.
6. **Update `game_state/current`** to `round_transition` with `round: 2`.

This ordering ensures that when students see the `round_transition` screen (teams reveal), their profile already has their `teamId` assigned.

### Answer Handling — Race Condition Fix

When a student submits an answer in Round 2, the app does **not** blindly trust `profile.teamId` from React state (which may be stale). Instead:

1. It checks `profile.teamId` from the React context.
2. If it is falsy and the game is in Round 2, it performs a **fresh Firestore `getDoc`** on the player's user document to resolve the current `teamId`.
3. It then determines whether the player is a team member or an audience member based on the resolved value.

This prevents a scenario where a player is incorrectly treated as audience because their local React state hadn't yet received the team assignment from Firestore.

---

## 👥 Roles & Permissions

### Admin

Determined by email match (`yashbose35@gmail.com`) on first profile creation. Also validated in Firestore rules via both email token claims and the `role` field in the user document.

Admins see the **Admin Dashboard** and have full write access to: `game_state`, `questions`, `teams`, `responses`, and `users`.

### Student

All other Google-authenticated users. Students see the **Student View** (waiting screen, question answering interface, results screen). They can only write their own `responses` and read leaderboard/team data.

### Audience (Round 2)

Any student who is not in the top 16 when Round 2 begins. They have no `teamId`. They can still answer questions (`isAudience: true` in their response), their answers appear in the audience poll on the display, but they earn zero points.

---

## 💯 Scoring System

### Round 1 — Individual

- Correct answer: `floor(points × (timeLeft / duration))`
  - A correct answer with 15s left on a 30s, 100-point question = `floor(100 × 0.5)` = **50 points**
  - A correct answer with full time remaining = maximum points
- Wrong answer: **0 points**
- No penalty in Round 1

### Round 2 — Team

- Correct answer: Same time-based formula as Round 1 (points awarded to both `totalScore` and `round2Score` on the user, and `totalScore` on the team)
- Wrong answer: **Penalty = `-floor(points / 4)`** deducted from both the user's `totalScore`/`round2Score` and the team's `totalScore`
- Audience members (no `teamId`): answer submission recorded, zero points awarded or deducted regardless

---

## 📝 Question Types

All questions have 4 options and a single correct answer.

### `mcq` — Multiple Choice

Standard text-only question. Question text and 4 answer options displayed.

### `image` — Image-Based

Requires a valid `mediaUrl` pointing to an image (any URL reachable from the browser). The image is displayed above the question text:
- On the **Auditorium Display**: large image in a rounded frame
- On the **Student View**: displayed in a 16:9 aspect-ratio container

### `audio` — Audio-Based

Requires a valid `mediaUrl` pointing to an audio file (must start with `http`). Behavior differs by view:
- **Auditorium Display**: Animated pulsing speaker graphic. Audio plays automatically when the question becomes active. Admin controls (play/pause, restart, volume slider, mute) are visible to the presenter.
- **Student View**: Shows a "LISTENING..." label with a pulsing speaker icon. Audio plays automatically on the student's device as well (auto-play; may be blocked by browser policy on some devices).

Audio is automatically stopped and reset when the question becomes inactive or the game state changes.

---

## 🛡 Admin Dashboard

Accessible to admin users at the main app URL. Sections:

### Live Stats Bar

Five real-time counters updated via `onSnapshot`:
- **Total Logins** — count of all documents in `/users`
- **Admins** — users with `role === 'admin'`
- **Students** — users with `role === 'student'`
- **Active Now** — students with `totalScore > 0`
- **Responses** — total documents in `/responses`

### Question Editor

Form to add or edit a question. Fields:
- **ID** — document ID (numeric string recommended, e.g. `"1"`)
- **Type** — `MCQ`, `Image`, or `Audio`
- **Question Text**
- **4 Option fields**
- **Correct Index** — zero-based (0 = Option A, 3 = Option D)
- **Points** — base point value
- **Duration** — timer in seconds
- **Round** — 1 or 2
- **Media URL** — optional, required for image/audio types

Click a question's edit icon in the quiz flow panel to populate the editor in edit mode.

### Quiz Flow Panel

Tabbed view (Round 1 / Round 2) listing all questions for that round. Each question row shows:
- Question ID, type, points
- Question text
- **Launch** button — sets `game_state` to `question_active` with that question ID and current timestamp
- **Edit** / **Delete** buttons (delete requires confirmation)

Questions are sorted numerically by ID.

### Quick Actions Panel

- **Show Leaderboard** — sets status to `showing_results`
- **Transition to Round 2** — triggers the full round transition sequence (requires ≥ 16 students)
- **Open Auditorium Display** — opens `?display=true` in a new tab

### Round 2 Teams Panel

Appears once teams exist. Shows all 4 teams with member avatars and current team scores, updated in real-time.

### Undo System

Certain destructive actions (Clear Round 1, Clear Round 2, Remove All Participants) are scheduled with a 10-second delay. A toast shows a countdown. Clicking **Undo** cancels the action. If another scheduled action is pending, it is executed immediately before the new one is queued.

### Danger Zone

Collapsible section (red, requires deliberate click to expand). Actions:

| Action | Effect |
|---|---|
| **Reset Game State & Scores** | Resets `game_state` to idle/round 1, sets all user scores to 0, resets all team scores to 0, deletes all responses. Requires two-step confirmation. |
| **Remove All Participants** | Deletes all student user documents, all team documents, and all response documents. 10-second undo window. |
| **Clear Round 1** | Deletes all questions with `round === 1`. 10-second undo window. |
| **Clear Round 2** | Deletes all questions with `round === 2`. 10-second undo window. |
| **Return to Round 1** | Sets game state back to `idle` / `round: 1`. Scores are preserved. |

All multi-document operations are executed in Firestore batches of up to 500 operations each to respect Firestore limits.

---

## 📺 Auditorium Display Mode

Access by appending `?display=true` to the app URL: `https://your-app.com?display=true`

This view is designed to be projected on a big screen. It is fullscreen-capable (button in the top-right corner). It subscribes to game state and renders a different UI for each status:

### `idle`
Animated logo with "GET READY TO COMPETE" message.

### `question_active`
- Large countdown timer ring (turns red + pulses when ≤ 5 seconds remaining)
- Question text in large heading
- Image or audio visualizer (if applicable)
- Audio controls panel for audio questions (visible to the presenter controlling the display screen)
- 4 option cards in a 2×2 grid
- When timer reaches 0, the correct answer card highlights green with a pulsing scale animation; wrong options fade out

### `showing_results`
- **Round 1**: Individual leaderboard (top 16 users with avatar, name, score, animated staggered entrance)
- **Round 2**: Two-column layout — team leaderboard on the left, audience poll on the right. The poll shows live percentage bars for each option, with the correct answer highlighted green.

### `round_transition`
Full-screen teams reveal with all 4 teams displayed in a 2×2 grid. Each team card shows the team name and the first names and avatars of its 4 members, with staggered entrance animations.

---

## 📱 Student View

Rendered for all non-admin authenticated users. Adapts based on `game_state.status`.

### Waiting (`idle` / `round_transition`)

**Without a team (Round 1 or non-qualifier):**
- Animated waiting indicator
- "Career Score" card showing `totalScore`

**With a team (Round 2 qualifier):**
- Team name and logo
- Team score (live)
- Personal Round 2 contribution and career score
- Live team member list with individual Round 2 scores

### Answering (`question_active`)

- Timer ring (bounces and turns red at < 5 seconds)
- Round badge and Team Mode badge (if applicable)
- Media content (image or audio indicator)
- Question text
- 4 answer buttons — selecting one locks the answer immediately (no changing)
- After selection: selected option highlighted cyan; disabled state for other options
- After timer reaches 0: correct answer turns green, selected wrong answer turns red
- **Floating stats bar** at the bottom of the screen showing Career Score, and if in a team: Team Score and personal Contribution

### Results (`showing_results`)

- Trophy icon
- "Check the Big Screen!" prompt
- Personal score card (career total)
- Team contribution card (if in a team)

---

## 🔒 Firestore Security Rules

Rules are defined in `firestore.rules` and enforce the following:

### `/users/{uid}`
- Any authenticated user can **read** individual documents and list (for leaderboard)
- A user can **create** their own document (with valid schema, `student` role only unless admin)
- A user can **update** only their own document, and only for the fields: `totalScore`, `round2Score`, `displayName`, `photoURL`. They cannot change their `role` or `teamId` themselves.
- Admins can do anything

### `/game_state/current`
- Any authenticated user can **read**
- Only admins can **write**

### `/questions/{id}`
- Any authenticated user can **read** (individual get or list)
- Only admins can **write**

### `/responses/{responseId}`
- Authenticated users can **create** responses where `userId` matches their own UID
- Users can **read** only their own responses; admins can read all
- Only admins can **update** or **delete**

### `/teams/{id}`
- Any authenticated user can **read** (get or list)
- Only admins can **create** or **delete**
- Admins or team members can **update**, but team members may only change `totalScore`

The `isAdmin()` function checks both the Firebase Auth token email claim (for the hardcoded admin email) and the `role` field on the user's Firestore document, to support future multi-admin setups.

---

## ⚙️ Setup and Configuration

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** → Sign-in method → **Google**.
3. Enable **Firestore Database** (start in production mode).
4. Copy your Firebase config object.

### 2. Configure Firebase

Replace the contents of [`firebase-applet-config.json`](./firebase-applet-config.json) with your Firebase project credentials:

```json
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

### 3. Set Admin Email

In two places, replace the hardcoded admin email with your own:

**[`src/AuthContext.tsx`](./src/AuthContext.tsx)** — line in `newProfile` creation:
```ts
role: user.email === 'your-admin@gmail.com' ? 'admin' : 'student',
```

**[`firestore.rules`](./firestore.rules)** — inside the `isAdmin()` function:
```
request.auth.token.email == "your-admin@gmail.com"
```

### 4. Deploy Firestore Security Rules

Using Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

### 5. Install Dependencies

```bash
npm install
```

---

## 🌍 Environment Variables

The `.env.example` file documents optional environment variables:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"   # For Gemini AI integration (optional)
APP_URL="MY_APP_URL"                 # Deployed app URL (optional)
```

These are not required for core quiz functionality. Copy `.env.example` to `.env` and fill in values if needed.

---

## 🚀 Running Locally

```bash
npm install
npm run dev
```

App will start at `http://localhost:3000`.

Open `http://localhost:3000` to access the main app (sign in with Google).  
Open `http://localhost:3000?display=true` to preview the auditorium display.

**Useful scripts:**

| Script | Command | Description |
|---|---|---|
| Dev server | `npm run dev` | Starts Vite dev server on port 3000 |
| Type check | `npm run lint` | Runs `tsc --noEmit` for type checking |
| Build | `npm run build` | Production build to `/dist` |
| Preview | `npm run preview` | Preview production build |
| Clean | `npm run clean` | Removes `/dist` folder |

---

## 📦 Deployment

Since the app is a pure client-side React SPA with Firebase as the backend, it can be deployed to any static hosting service.

### Firebase Hosting (recommended)

```bash
npm run build
firebase deploy --only hosting
```

Ensure your `firebase.json` has hosting configured:

```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  }
}
```

### Other Hosts

Upload the `dist/` folder after running `npm run build` to Vercel, Netlify, Cloudflare Pages, or any CDN. All routes should rewrite to `index.html` for client-side routing.

---

## ⚠️ Known Behaviors & Edge Cases

### Popup Blocker Warning
The login page shows a hint: *"If nothing happens, make sure popups are enabled."* Google Sign-In uses a popup by default. If blocked, users should open the app in a new browser tab or allow popups for the domain.

### Audio Autoplay
Browser autoplay policies may block audio on first load without user interaction. On the [Auditorium Display](#-auditorium-display-mode), the admin should interact with the page at least once before launching an audio question. On student devices, audio autoplay may silently fail — this is caught and logged but not surfaced to the user.

### Round 2 Minimum Players
Clicking "Transition to Round 2" with fewer than 16 students will display the error: *"Need at least 16 students to form 4 teams!"* and abort without making any changes.

### Timer Accuracy
The countdown timer uses wall-clock time (`startTime` stored in Firestore as an ISO string) rather than a server-side decrement. Each client computes `remaining = max(0, duration - floor((now - startTime) / 1000))` every 100ms. This means slight clock drift between devices is possible but negligible for typical quiz durations.

### Question ID Ordering
Questions are fetched without Firestore `orderBy` (to avoid requiring a composite index) and sorted in-memory numerically by ID. Use numeric string IDs (`"1"`, `"2"`, `"10"`) for correct sort order. String IDs like `"q1"` fall back to lexicographic sort.

### Score Decrement in Round 2
A wrong answer in Round 2 deducts `floor(points / 4)` from both the user's `totalScore` and the team's `totalScore`. This can bring scores below zero if a player answers many questions wrong.

### Audience Poll Visibility
The audience poll panel on the [Auditorium Display](#-auditorium-display-mode) only appears during `showing_results` in **Round 2**. It reads from the `responses` collection filtered by `questionId` and `isAudience: true`.
