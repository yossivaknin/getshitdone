# SitRep - Mission Control

A tactical task management and mission control application built with Next.js, Supabase, and Google Calendar integration.

## Features

- 🎯 Kanban-style task management (The Queue, Active, Shipped)
- 📅 Smart Google Calendar integration with automatic scheduling
- 🏷️ Tag-based organization and filtering
- 👥 Multi-user support with authentication
- 📱 Progressive Web App (PWA) support
- 🎨 Tactical/utilitarian design aesthetic

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

See `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for detailed deployment instructions.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **Calendar Integration**: Google Calendar API
- **Drag & Drop**: @dnd-kit

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Deployment](https://vercel.com/docs)
