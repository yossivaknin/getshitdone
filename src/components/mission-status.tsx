'use client'

import { useMemo, useState, useEffect } from 'react';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BriefingData {
  readinessScore: number;
  headline: string;
  tacticalPoints: string[];
}

interface MissionStatusProps {
  tasks: any[];
}

export function MissionStatus({ tasks }: MissionStatusProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch AI briefing
  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        setIsLoadingBriefing(true);
        setError(null);
        
        const accessToken = typeof window !== 'undefined' 
          ? localStorage.getItem('google_calendar_token')
          : null;
        
        const response = accessToken
          ? await fetch('/api/briefing', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ accessToken }),
            })
          : await fetch('/api/briefing');
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch briefing: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        setBriefing(data);
      } catch (err: any) {
        console.error('[MissionStatus] Error fetching briefing:', err);
        setError(err.message || 'Failed to load briefing');
      } finally {
        setIsLoadingBriefing(false);
      }
    };

    fetchBriefing();
  }, []);

  // Memoize date calculations to avoid recalculating on every render
  const { today, endOfWeek } = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const endOfWeekDate = new Date(todayDate);
    endOfWeekDate.setDate(todayDate.getDate() + (7 - todayDate.getDay()));
    endOfWeekDate.setHours(23, 59, 59, 999);
    
    return { today: todayDate, endOfWeek: endOfWeekDate };
  }, []); // Only calculate once per day (could add date-based dependency for multi-day sessions)

  // Optimized date parsing helper (memoized for better performance)
  const parseTaskDate = useMemo(() => {
    const dateCache = new Map<string, Date | null>();
    return (dueDate: string, todayDate: Date): Date | null => {
      if (dateCache.has(dueDate)) {
        return dateCache.get(dueDate)!;
      }
      
      // Handle relative dates (legacy format)
      if (dueDate === 'Today') {
        dateCache.set(dueDate, todayDate);
        return todayDate;
      }
      
      // Handle ISO date strings (YYYY-MM-DD format)
      try {
        const parsed = new Date(dueDate + 'T00:00:00');
        if (isNaN(parsed.getTime())) {
          dateCache.set(dueDate, null);
          return null;
        }
        parsed.setHours(0, 0, 0, 0);
        dateCache.set(dueDate, parsed);
        return parsed;
      } catch {
        dateCache.set(dueDate, null);
        return null;
      }
    };
  }, []);

  // Parse due dates and categorize tasks
  const tasksToday = useMemo(() => {
    return tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      
      const dueDate = parseTaskDate(task.dueDate, today);
      return dueDate !== null && dueDate.getTime() === today.getTime();
    });
  }, [tasks, today, parseTaskDate]);

  const tasksThisWeek = useMemo(() => {
    return tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      
      // Handle relative dates (legacy format)
      if (task.dueDate === 'Today' || task.dueDate === 'Tomorrow') return true;
      
      // Use cached date parser
      const dueDate = parseTaskDate(task.dueDate, today);
      if (dueDate === null) return false;
      return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
    });
  }, [tasks, today, endOfWeek, parseTaskDate]);

  // Calculate total time budget
  const todayTimeBudget = tasksToday.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);
  const weekTimeBudget = tasksThisWeek.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);

  // Generate dynamic status message
  const getStatusMessage = () => {
    const activeCount = tasks.filter((t: any) => t.list_id === 'in-progress').length;
    const todoCount = tasks.filter((t: any) => t.list_id === 'todo').length;
    const doneCount = tasks.filter((t: any) => t.list_id === 'done').length;

    if (tasksToday.length === 0 && activeCount === 0) {
      return "No fires today. Clear runway.";
    }
    
    if (tasksToday.length > 5) {
      return "Heavy load today. Focus on the critical path.";
    }
    
    if (activeCount > 3) {
      return "Too many active threads. Pick one and finish it.";
    }
    
    if (doneCount > 5) {
      return "You're crushing it. Keep the momentum.";
    }
    
    if (tasksToday.length > 0 && activeCount === 0) {
      return "Queue is loaded. Time to start executing.";
    }
    
    return "Steady state. Execute with precision.";
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="w-full bg-white md:border-l border-slate-300 flex flex-col h-full">
      <div className="p-3 sm:p-3.5 md:p-4 border-b border-slate-300">
        <h2 className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1 flex items-center gap-1.5 sm:gap-2">
          <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          SITREP // LIVE
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 md:p-4 space-y-3 sm:space-y-4 md:space-y-6">
        {/* AI Briefing Section */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-md p-4 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-500/10">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 uppercase tracking-widest text-[10px] font-semibold">
                Daily Strategy
              </span>
              {!isLoadingBriefing && !error && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-emerald-400 text-[9px] uppercase font-medium">Live</span>
                </div>
              )}
            </div>
            {briefing && !isLoadingBriefing && !error && (
              <div className="text-right">
                <div className="text-emerald-400/40 text-[9px] uppercase tracking-widest mb-0.5">Readiness</div>
                <div className="text-emerald-400 text-xl font-bold">{briefing.readinessScore}%</div>
              </div>
            )}
          </div>

          {isLoadingBriefing && (
            <div className="text-emerald-400/80 text-xs py-2">Loading briefing...</div>
          )}

          {error && (
            <div className="text-red-400/80 text-xs py-2">{error}</div>
          )}

          {briefing && !isLoadingBriefing && !error && (
            <div className="space-y-3">
              {/* Headline */}
              <div className="bg-slate-800/40 border-l-2 border-emerald-500/50 pl-3 py-2 rounded-sm">
                <div className="text-white text-sm font-semibold leading-snug">
                  {briefing.headline}
                </div>
              </div>

              {/* Tactical Points */}
              <div>
                <div className="text-emerald-400/50 text-[9px] uppercase tracking-widest mb-2">
                  Key Insights
                </div>
                <ul className="space-y-1.5">
                  {briefing.tacticalPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-emerald-300/80 text-xs leading-relaxed">
                      <span className="text-emerald-500/40 mt-0.5 flex-shrink-0">•</span>
                      <span className="flex-1">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="bg-slate-900 rounded-md p-3 border border-slate-700">
          <p className="text-sm font-medium text-green-400 leading-relaxed font-mono">
            {getStatusMessage()}
          </p>
        </div>

        {/* Today's Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Today</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tasks</span>
              <span className="text-sm font-semibold text-gray-900 font-mono">{tasksToday.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Time Budget</span>
              <span className="text-sm font-semibold text-gray-900 font-mono">
                {todayTimeBudget > 0 ? formatDuration(todayTimeBudget) : '—'}
              </span>
            </div>
            {tasksToday.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-300">
                <div className="space-y-1.5">
                  {tasksToday.slice(0, 3).map((task: any) => (
                    <div key={task.id} className="text-xs text-gray-700 line-clamp-1">
                      • {task.title}
                    </div>
                  ))}
                  {tasksToday.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{tasksToday.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* This Week's Tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-gray-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">This Week</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tasks</span>
              <span className="text-sm font-semibold text-gray-900 font-mono">{tasksThisWeek.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Time Budget</span>
              <span className="text-sm font-semibold text-gray-900 font-mono">
                {weekTimeBudget > 0 ? formatDuration(weekTimeBudget) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

