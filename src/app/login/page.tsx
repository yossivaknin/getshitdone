'use client'

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { login, signup, loginWithGoogle } from "./actions";
import { useSearchParams } from 'next/navigation';
import { Chrome } from 'lucide-react';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const message = searchParams?.get('message');
  const [isSignup, setIsSignup] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* Left Panel - Brand */}
      <div className="w-full md:w-1/2 bg-slate-900 flex items-center justify-center p-8 md:p-12 lg:p-16">
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              SITREP // HQ
            </h1>
            <h2 className="text-xl md:text-2xl text-emerald-400 font-mono uppercase tracking-widest">
              Command Your Day.
            </h2>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-700">
            <div className="font-mono text-sm md:text-base text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">[ ]</span>
                <span>UNIFIED COMMAND VIEW</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">[ ]</span>
                <span>TACTICAL CALENDAR SYNC</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">[ ]</span>
                <span>MISSION EXECUTION</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <span className={cursorVisible ? 'opacity-100' : 'opacity-0'}>_</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-6 md:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 
              className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight"
              style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              IDENTIFY
            </h2>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-600">
              Enter credentials to access the workspace.
            </p>
          </div>

          {message && (
            <div className="p-3 bg-red-50 border-2 border-red-200 text-red-600 text-sm rounded-sm text-center font-mono">
              {message}
            </div>
          )}

          <div className="space-y-5">
            <form className="space-y-5">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="font-mono text-[10px] uppercase font-bold tracking-widest text-gray-700"
                >
                  EMAIL
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="operator@mission.control" 
                  className="font-mono rounded-sm border-slate-300 focus:ring-0 focus:border-slate-900 focus:border-2"
                />
              </div>

              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="font-mono text-[10px] uppercase font-bold tracking-widest text-gray-700"
                >
                  PASSWORD
                </Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="font-mono rounded-sm border-slate-300 focus:ring-0 focus:border-slate-900 focus:border-2"
                />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  formAction={isSignup ? signup : login} 
                  className="w-full bg-slate-900 text-white rounded-sm font-bold tracking-widest uppercase hover:bg-slate-800 font-mono text-xs py-3"
                >
                  INITIATE SESSION
                </Button>

                <button
                  type="button"
                  onClick={() => setIsSignup(!isSignup)}
                  className="font-mono text-xs uppercase tracking-widest text-slate-600 hover:text-slate-900 underline text-center"
                >
                  {isSignup ? 'Already have access? Log in' : 'Need access? Sign up'}
                </button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-50 px-2 font-mono text-slate-500 tracking-widest">OR</span>
              </div>
            </div>

            <form action={loginWithGoogle}>
              <Button 
                type="submit"
                variant="outline"
                className="w-full border-2 border-slate-300 bg-white text-slate-900 rounded-sm font-bold tracking-widest uppercase hover:bg-slate-50 font-mono text-xs py-3 flex items-center justify-center gap-2"
              >
                <Chrome className="w-4 h-4" />
                CONTINUE WITH GOOGLE
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
