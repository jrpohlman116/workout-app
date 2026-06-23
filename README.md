# Ironform

A progressive web app for powerlifters running the Juggernaut Method. Tracks training maxes, generates wave schedules around a meet date, logs workouts, and surfaces projected 1RMs over time.

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · Supabase

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd workout-app
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are in your Supabase project under **Settings → API**.

### 3. Run database migrations

Apply all migrations in order using the Supabase CLI or the SQL editor in the Supabase dashboard. Migration files live in `supabase/migrations/`.

With the Supabase CLI:

```bash
npx supabase db push
```

Or paste each file manually into the SQL editor if you prefer.

---

## Running locally

```bash
npm run dev
```

Opens at `http://localhost:5173`.

---

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check without emitting files |
| `npm run lint` | ESLint |
| `npm run test` | Run all tests (watch mode) |
| `npm run test:unit` | Unit tests only |
| `npm run test:integration` | Integration tests against Supabase |
| `npm run test:smoke` | Database smoke test |
| `npm run test:coverage` | Coverage report |

### Integration tests

Integration tests hit a real Supabase database. They expect the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars to be present, pointed at a project that has all migrations applied.

---

## Project structure

```
src/
  components/
    accessible/   # Accessible primitives (modal, select, progress, etc.)
    features/     # Domain components (auth, onboarding, modals, etc.)
    layout/       # Navigation
    ui/           # Design-system atoms (Button, Input, Card, TabBar, …)
  contexts/       # AuthContext, ThemeContext
  hooks/          # useAnimations, useFormState, useWorkoutData, etc.
  lib/
    calculations.ts   # Juggernaut set math, Wilks/DOTS/IPF-GL scoring
    constants.ts      # Labels, phase descriptions, program defaults
    exercises.ts      # Base and additional exercise lists
    supabase.ts       # Supabase client + DB types
    types.ts          # Shared TypeScript types
  pages/
    Calculator/       # 1RM, Wilks, plate calculator
    Home/             # Weekly workout dashboard
    Profile/          # Settings tabs (body stats, maxes, training, security)
    Progress/         # Charts, records, workout log, meet history
    WorkoutDetail/    # Step-through workout logging flow
  test/
    unit/             # Component unit tests (jsdom)
    integration/      # End-to-end DB tests (real Supabase)
supabase/
  migrations/         # Ordered SQL migrations
```
