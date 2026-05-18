# ethnogrow

> Research tools for curious people. Build questionnaires, gather insights, understand what matters.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Backend/DB**: Supabase (auth, Postgres, RLS)
- **AI**: Anthropic Claude API
- **Deployment**: Vercel

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project structure

```
src/
├── app/
│   ├── dashboard/          # Researcher app (protected)
│   │   ├── new/            # New project / questionnaire builder
│   │   └── projects/[id]/  # Project detail (builder, responses, share)
│   ├── p/[token]/          # Public participant view (no auth)
│   ├── login/
│   └── signup/
├── components/
│   ├── builder/
│   │   ├── QuestionnaireBuilder.tsx  # Main builder component
│   │   ├── QuestionEditor.tsx        # Per-question editor
│   │   └── QuestionTypeSelector.tsx  # Type picker
│   └── ParticipantView.tsx           # Card-by-card participant experience
├── lib/
│   ├── supabase.ts         # Supabase client setup
│   └── questions.ts        # Question factories + validation
└── types/
    └── index.ts            # All TypeScript types
```

---

## V1 roadmap

- [x] Auth (signup, login)
- [x] Questionnaire builder (all 4 question types, drag to reorder)
- [x] Participant card view (no login required)
- [x] Response storage
- [ ] AI-powered report generation (Claude API)
- [ ] Results dashboard with charts
- [ ] Payments (Lemon Squeezy)

---

## Deploy to Vercel

```bash
vercel --prod
```

Add the same env vars in your Vercel project settings.
