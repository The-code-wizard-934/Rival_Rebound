# RIVAL REBOUND

Real-time auditorium quiz platform built with React, Vite, TypeScript, Firebase Authentication, and Firestore.

## What This Project Does

- Google sign-in based access control
- Admin and student roles
- Live quiz state synchronization through Firestore
- Question formats: MCQ, image, and audio
- Real-time individual and team leaderboards
- Admin controls to create/edit questions and run rounds

## Tech Stack

- Frontend: React 19 + TypeScript + Vite
- Styling and UI: Tailwind CSS + Motion + Lucide icons
- Backend services: Firebase Authentication + Cloud Firestore
- Deployment and config: Firebase CLI (rules and indexes)

## Project Structure

```text
rival-rebound/
|-- src/
|   |-- App.tsx                    # Main app UI and game flow
|   |-- AuthContext.tsx            # Auth, user profile bootstrap, game_state listener
|   |-- firebase.ts                # Firebase initialization and Firestore error handling
|   |-- seed.ts                    # Seed initial game state and sample questions
|   |-- types.ts                   # Shared TypeScript domain models
|   |-- index.css                  # Global styles
|   |-- main.tsx                   # React entry point
|   `-- lib/
|       `-- utils.ts               # Utility helpers
|-- firebase-applet-config.json    # Firebase web app config used by src/firebase.ts
|-- firebase-blueprint.json        # Data blueprint for entities and Firestore paths
|-- firebase.json                  # Firebase CLI config (Firestore rules and indexes)
|-- firestore.rules                # Security rules
|-- firestore.indexes.json         # Firestore indexes
|-- .firebaserc                    # Firebase project alias mapping
|-- metadata.json                  # App metadata
|-- package.json                   # Scripts and dependencies
|-- tsconfig.json                  # TypeScript config
|-- vite.config.ts                 # Vite config
`-- index.html                     # Vite HTML entry
```

## Firestore Data Model

- users/{uid}
  - User profile, role, score, and optional team assignment
- game_state/current
  - Global game status, current question, round, and timing
- questions/{id}
  - Quiz questions and metadata
- responses/{userId_questionId}
  - Per-user answer records
- teams/{id}
  - Team info and team score

See these files for schema and access logic:

- firebase-blueprint.json
- firestore.rules

## Authentication and Roles

- Sign-in uses Google popup auth.
- Users are stored in Firestore at first login.
- Admin role is currently granted to one hardcoded email in:
  - src/AuthContext.tsx
  - firestore.rules

If you want a different admin, update the email in both places.

## Prerequisites

- Node.js 18+
- npm
- Firebase CLI access (for Firestore deploy)
- A Firebase project

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Verify Firebase project files are correct for your environment.

- firebase-applet-config.json
- .firebaserc

3. Start the development server.

```bash
npm run dev
```

4. Open the app.

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Create production build
npm run preview   # Preview production build locally
npm run lint      # Type-check only (tsc --noEmit)
npm run clean     # Remove dist folder (uses rm -rf)
```

Windows note for clean script:

- npm run clean uses rm -rf, which may not work in some Windows shells.
- PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force dist
```

## Firebase Setup and Deploy

This repo currently configures Firestore rules and indexes via firebase.json.

1. Check CLI.

```bash
npx -y firebase-tools@latest --version
```

2. Login.

```bash
npx -y firebase-tools@latest login
```

3. Confirm active project.

```bash
npx -y firebase-tools@latest use
```

4. Deploy Firestore rules and indexes.

```bash
npx -y firebase-tools@latest deploy --only firestore
```

Or deploy rules only:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

Or deploy indexes only:

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

## Seeding Initial Data

The project includes src/seed.ts to create:

- game_state/current
- sample questions

If you wire this into an admin action, call seedDatabase() once to initialize the game.

## Troubleshooting

- Popup blocked during login:
  - Allow popups for localhost and retry Google sign-in.
- Permission denied in Firestore:
  - Confirm logged-in user and role in users/{uid}.
  - Confirm admin email in both AuthContext.tsx and firestore.rules.
- Rules updated but app behavior unchanged:
  - Re-deploy rules and verify active Firebase project.

