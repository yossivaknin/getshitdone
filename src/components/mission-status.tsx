'use client'

import { useMemo } from 'react';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionStatusProps {
  tasks: any[];
}

export function MissionStatus({ tasks }: MissionStatusProps) {
  // Calculate today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Sunday)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  // Parse due dates and categorize tasks
  const tasksToday = useMemo(() => {
    return tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      
      // Handle relative dates (legacy format)
      if (task.dueDate === 'Today') return true;
      
      // Handle ISO date strings (YYYY-MM-DD format)
      try {
        // If it's already an ISO date string, parse it directly
        const dueDate = new Date(task.dueDate + 'T00:00:00'); // Add time to avoid timezone issues
        if (isNaN(dueDate.getTime())) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      } catch {
        return false;
      }
    });
  }, [tasks, today]);

  const tasksThisWeek = useMemo(() => {
    return tasks.filter((task: any) => {
      if (task.list_id === 'done') return false;
      if (!task.dueDate) return false;
      
      // Handle relative dates (legacy format)
      if (task.dueDate === 'Today' || task.dueDate === 'Tomorrow') return true;
      
      // Handle ISO date strings (YYYY-MM-DD format)
      try {
        // If it's already an ISO date string, parse it directly
        const dueDate = new Date(task.dueDate + 'T00:00:00'); // Add time to avoid timezone issues
        if (isNaN(dueDate.getTime())) return false;
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() >= today.getTime() && dueDate.getTime() <= endOfWeek.getTime();
      } catch {
        return false;
      }
    });
  }, [tasks, today, endOfWeek]);

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

