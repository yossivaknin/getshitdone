'use client'

import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface BriefingData {
  readinessScore: number;
  headline: string;
  tacticalPoints: string[];
}

interface InsightsProps {
  tasks: any[];
}

export function Insights({ tasks }: InsightsProps) {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStrategyExpanded, setIsStrategyExpanded] = useState(true);
  const [isInsightExpanded, setIsInsightExpanded] = useState(true);

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
        console.error('[Insights] Error fetching briefing:', err);
        setError(err.message || 'Failed to load briefing');
      } finally {
        setIsLoadingBriefing(false);
      }
    };

    fetchBriefing();
  }, []);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const parseTaskDate = (dueDate: string): Date | null => {
      if (!dueDate) return null;
      try {
        const parsed = new Date(dueDate + 'T00:00:00');
        if (isNaN(parsed.getTime())) return null;
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      } catch {
        return null;
      }
    };

    const tasksToday = tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      return dueDate !== null && dueDate.getTime() === today.getTime();
    });

    const tasksThisWeek = tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      if (dueDate === null) return false;
      return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
    });

    const tasksDone = tasks.filter((task: any) => task.list_id === 'done');

    const todayTimeBudget = tasksToday.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);
    const weekTimeBudget = tasksThisWeek.reduce((sum: number, task: any) => sum + (task.duration || 0), 0);
    const todayTimeCompleted = tasksDone.filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      return dueDate !== null && dueDate.getTime() === today.getTime();
    }).reduce((sum: number, task: any) => sum + (task.duration || 0), 0);
    const weekTimeCompleted = tasksDone.filter((task: any) => {
      if (!task.dueDate) return false;
      const dueDate = parseTaskDate(task.dueDate);
      if (dueDate === null) return false;
      return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
    }).reduce((sum: number, task: any) => sum + (task.duration || 0), 0);

    const formatDuration = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
    };

    return {
      todayTasks: tasksToday.length,
      todayTasksCompleted: tasksDone.filter((task: any) => {
        if (!task.dueDate) return false;
        const dueDate = parseTaskDate(task.dueDate);
        return dueDate !== null && dueDate.getTime() === today.getTime();
      }).length,
      todayTimeBudget: todayTimeBudget,
      todayTimeCompleted: todayTimeCompleted,
      weekTasks: tasksThisWeek.length,
      weekTasksCompleted: tasksDone.filter((task: any) => {
        if (!task.dueDate) return false;
        const dueDate = parseTaskDate(task.dueDate);
        if (dueDate === null) return false;
        return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
      }).length,
      weekTimeBudget: weekTimeBudget,
      weekTimeCompleted: weekTimeCompleted,
      completedTasks: tasksDone.slice(0, 5), // Show last 5 completed
      formatDuration,
    };
  }, [tasks]);

  return (
    <div className="w-full bg-[#1A1A1A] flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          Insights
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Daily Strategy Tab */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsStrategyExpanded(!isStrategyExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Daily Strategy</h3>
            </div>
            {isStrategyExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {isStrategyExpanded && (
            <div className="p-4 border-t border-gray-800">
              {isLoadingBriefing && (
                <div className="text-gray-500 text-sm py-2">Loading...</div>
              )}
              {error && (
                <div className="text-red-400 text-sm py-2">{error}</div>
              )}
              {briefing && !isLoadingBriefing && !error && (
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <p className="text-white text-sm leading-relaxed">
                    {briefing.headline}
                  </p>
                  {briefing.tacticalPoints && briefing.tacticalPoints.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {briefing.tacticalPoints.map((point, idx) => (
                        <li key={idx} className="text-gray-300 text-sm leading-relaxed flex items-start gap-2">
                          <span className="text-emerald-500 mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Daily Insight Tab */}
        <div className="border border-gray-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setIsInsightExpanded(!isInsightExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm" />
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Daily Insight</h3>
            </div>
            {isInsightExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {isInsightExpanded && (
            <div className="p-4 border-t border-gray-800 space-y-6">
              {/* Today Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Today</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Tasks</span>
                    <span className="text-sm font-semibold text-white">
                      {stats.todayTasksCompleted}/{stats.todayTasks}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.todayTasks > 0 ? (stats.todayTasksCompleted / stats.todayTasks) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Time</span>
                    <span className="text-white font-mono">
                      {stats.formatDuration(stats.todayTimeCompleted)} / {stats.formatDuration(stats.todayTimeBudget)}
                    </span>
                  </div>
                </div>
              </div>

              {/* This Week Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">This Week</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Tasks</span>
                    <span className="text-sm font-semibold text-white">
                      {stats.weekTasksCompleted}/{stats.weekTasks}
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.weekTasks > 0 ? (stats.weekTasksCompleted / stats.weekTasks) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Time</span>
                    <span className="text-white font-mono">
                      {stats.formatDuration(stats.weekTimeCompleted)} / {stats.formatDuration(stats.weekTimeBudget)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Completed Section */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Completed</h3>
                <div className="space-y-2">
                  {stats.completedTasks.length === 0 ? (
                    <div className="text-gray-500 text-sm">No completed tasks</div>
                  ) : (
                    stats.completedTasks.map((task: any) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-gray-300 flex-1 truncate">{task.title}</span>
                        {task.duration && (
                          <span className="text-gray-500 text-xs font-mono">
                            {stats.formatDuration(task.duration)}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

