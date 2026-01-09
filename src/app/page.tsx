import { redirect } from 'next/navigation';

export default function LandingPage() {
  // DEVELOPMENT MODE: Redirect directly to app (bypassing login)
  // TODO: Restore login/signup flow before production deployment
  redirect('/app');
  
  // Original landing page code is preserved in the git history
  // To restore: git show HEAD:src/app/page.tsx > src/app/page.tsx
}
