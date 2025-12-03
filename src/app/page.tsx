import { ArrowRight, Calendar, CheckSquare, Clock, Layout, ShieldAlert, Bot, BrainCircuit, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-slate-900" />
            <span className="font-space-grotesk text-xl font-bold tracking-tight text-slate-900">
              SITREP // HQ
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/login"
              className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900"
            >
              Log In
            </a>
            <a
              href="/login"
              className="group flex items-center gap-2 rounded-sm bg-slate-900 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-emerald-600"
            >
              Get Started
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden border-b border-slate-200 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-50 px-3 py-1">
            <Zap className="h-3 w-3 text-emerald-600 fill-emerald-600" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              AI-Powered Execution Engine
            </span>
          </div>
          
          <h1 className="font-space-grotesk text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-7xl">
            THE TO-DO LIST THAT <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">
              FORCES EXECUTION.
            </span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-lg text-slate-600 font-medium">
            Stop hoarding tasks. SitRep integrates directly with your Google Calendar, 
            uses AI to block time for deep work, and holds you accountable until the job is done.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/login"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-sm bg-emerald-600 px-8 text-sm font-bold uppercase tracking-widest text-white shadow-lg transition-all hover:bg-emerald-500 hover:shadow-emerald-500/20 sm:w-auto"
            >
              <Layout className="h-4 w-4" />
              Sync My Calendar
            </a>
            <a
              href="#capabilities"
              className="flex h-12 w-full items-center justify-center gap-3 rounded-sm border border-slate-300 bg-white px-8 text-sm font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* --- PROBLEM STATEMENT (The "Execution Gap") --- */}
      <section className="bg-slate-900 px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div>
              <h2 className="font-space-grotesk text-3xl font-bold text-white sm:text-4xl">
                MOST APPS LET YOU <span className="text-amber-500">IGNORE</span> YOUR WORK.
              </h2>
              <p className="mt-6 text-slate-400 leading-relaxed">
                You write a task down. You forget it. You reschedule it for "tomorrow." 
                <br /><br />
                That's not productivity; that's procrastination disguised as planning.
                <br /><br />
                <strong>SitRep is different.</strong> We don't just list your tasks; we actively schedule them into your real life. 
                Our AI scans your existing stack (Calendar, Email) to find the perfect slot, blocks it, and ensures you show up.
              </p>
            </div>
            
            {/* Terminal Visualization - AI Logic */}
            <div className="relative rounded-sm border border-slate-700 bg-black p-6 font-mono text-xs shadow-2xl">
              <div className="absolute top-0 left-0 right-0 flex h-8 items-center gap-2 border-b border-slate-800 bg-slate-800/50 px-4">
                <div className="h-2 w-2 rounded-full bg-slate-600" />
                <div className="h-2 w-2 rounded-full bg-slate-600" />
                <span className="ml-2 text-slate-500">ai_scheduler_agent.log</span>
              </div>
              <div className="mt-4 space-y-3 text-slate-300">
                <p className="opacity-50"># Analyzing user workload...</p>
                <p>{'>'} <span className="text-amber-400">DETECTED:</span> "Client Proposal" due TOMORROW.</p>
                <p>{'>'} <span className="text-amber-400">STATUS:</span> UNSCHEDULED.</p>
                <p>{'>'} <span className="text-blue-400">SCANNING CALENDAR:</span></p>
                <p className="pl-4 opacity-75">-- 9:00 AM: BUSY (Team Standup)</p>
                <p className="pl-4 opacity-75">-- 10:00 AM: BUSY (Sales Call)</p>
                <p className="pl-4 text-emerald-400">-- 11:30 AM: OPEN SLOT FOUND (90m)</p>
                <p>{'>'} INITIATING AUTO-BLOCK...</p>
                <p>{'>'} <span className="text-emerald-400">ACTION:</span> Created Event "Focus: Client Proposal"</p>
                <p>{'>'} <span className="animate-pulse text-emerald-500 font-bold">READY FOR EXECUTION.</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CAPABILITIES (Value Props) --- */}
      <section id="capabilities" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-space-grotesk text-3xl font-bold text-slate-900">BUILT FOR RELENTLESS EXECUTION</h2>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-slate-500">Core Features</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative border border-slate-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg">
              <div className="mb-6 inline-flex rounded-sm bg-slate-100 p-3 text-slate-900 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="mb-3 font-space-grotesk text-xl font-bold">Deep Stack Integration</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                We live where you live. SitRep syncs two-way with Google Calendar. 
                If a meeting runs late, we adjust. If you block time, we respect it. 
                No manual data entry required.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative border border-slate-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg">
              <div className="mb-6 inline-flex rounded-sm bg-slate-100 p-3 text-slate-900 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="mb-3 font-space-grotesk text-xl font-bold">AI Accountability Agent</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                We will find you. If a task is slipping, our AI nudges you. 
                It analyzes your habits and suggests the best time to tackle 
                your hardest work, ensuring you actually finish.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative border border-slate-200 bg-white p-8 transition-all hover:border-emerald-500 hover:shadow-lg">
              <div className="mb-6 inline-flex rounded-sm bg-slate-100 p-3 text-slate-900 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h3 className="mb-3 font-space-grotesk text-xl font-bold">Intelligent Chunking</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                Big projects are scary. Our engine automatically breaks tasks {'>'}1 hour 
                into manageable sprints and finds open slots in your day to fit them in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="bg-slate-900 border-t border-slate-800 px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <ShieldAlert className="mx-auto mb-6 h-12 w-12 text-emerald-500" />
          <h2 className="mb-6 font-space-grotesk text-4xl font-bold text-white">
            TAKE BACK CONTROL.
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Join the only platform that cares about <em>done</em> more than <em>to-do</em>.
          </p>
          <a
            href="/login"
            className="inline-flex h-14 items-center gap-3 rounded-sm bg-white px-10 text-sm font-bold uppercase tracking-widest text-slate-900 transition-all hover:bg-emerald-500 hover:text-white"
          >
            Start Executing
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-6 font-mono text-xs text-slate-600">
            NO CREDIT CARD REQUIRED FOR BASIC OPS.
          </p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-slate-900" />
            <span className="font-space-grotesk font-bold tracking-tight text-slate-900">
              SITREP
            </span>
          </div>
          <p className="font-mono text-xs text-slate-400">
            © {new Date().getFullYear()} SITREP SYSTEMS. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
