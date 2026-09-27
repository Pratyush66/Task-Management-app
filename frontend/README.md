# TaskFlow Frontend (Next.js + TypeScript)

The client application for **TaskFlow**, built with Next.js (App Router), TypeScript, and a modern custom Vanilla CSS design system.

---

## 🌟 Key Features

- **Google OAuth 2.0 Authentication**: Sign in with personal or workspace Gmail accounts via Supabase Auth.
- **Interactive Evaluation Demo Account**: Allows reviewers and evaluators to test all views and features instantly without needing prior Google Cloud Console OAuth setup.
- **Task Management**:
  - Create tasks with title, description, priority (`low`, `medium`, `high`, `urgent`), due date, and assignees.
  - Interactive status toggles (To Do, In Progress, Completed, Cancelled).
  - Assign tasks to other registered team members.
  - Multi-criteria filtering (All, Assigned to me, Created by me, Status, Priority, Search).
- **Automated Gmail Notifications**:
  - Assigning a task sends an automated notification email to the assignee's inbox.
  - Marking a task completed sends a completion notice to the creator and assignee.
- **Premium Design System**: Dark-themed UI with glassmorphism, glowing priority badges, responsive grid layouts, accessible `<dialog>` modals, and toasts.

---

## 📁 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx             # Root layout with Auth & Toast providers
│   ├── globals.css            # Custom design tokens, glassmorphism, responsive grid
│   ├── page.tsx               # Protected task dashboard
│   ├── login/
│   │   └── page.tsx           # Google OAuth & Demo login view
│   └── auth/callback/
│       └── page.tsx           # OAuth redirect & profile synchronization
├── components/
│   ├── Navbar.tsx             # Brand header, active user profile, "+ New Task" CTA
│   ├── StatsCards.tsx         # Real-time metric counters
│   ├── FilterBar.tsx          # Scope tabs, search, and status/priority dropdowns
│   ├── TaskCard.tsx           # Task card with completion toggle & metadata
│   └── TaskModal.tsx          # Accessible modal dialog for task creation/editing
├── context/
│   ├── AuthContext.tsx        # Authentication session state & provider
│   └── ToastContext.tsx       # Toast notifications provider
├── lib/
│   ├── api.ts                 # Typed HTTP client communicating with Flask backend
│   └── supabase.ts            # Supabase client initialization
└── types/
    └── index.ts               # Shared TypeScript data models & interfaces
```

---

## 🛠️ Environment Variables

Create `.env.local` inside `frontend/`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Flask Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

---

## 🚢 Deployment to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import this repository and set the **Root Directory** to `frontend`.
4. Configure the Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (Points to your live Flask backend on Render/Railway)
5. Click **Deploy**.
