'use client'

interface MotivatorSubtitleProps {
  tasks: any[];
}

export function MotivatorSubtitle({ tasks }: MotivatorSubtitleProps) {
  // Count tasks by status
  const inProgressCount = tasks.filter((task: any) => task.list_id === 'in-progress').length;
  const todoCount = tasks.filter((task: any) => task.list_id === 'todo').length;
  
  // Count completed tasks today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedCount = tasks.filter((task: any) => {
    if (task.list_id !== 'done') return false;
    // If task has a dueDate, check if it was completed today
    // For now, we'll count all done tasks as "completed today" since we don't have completion timestamps
    // In a real app, you'd check task.completedAt or similar
    return true;
  }).length;

  // Determine message based on rules
  if (inProgressCount > 3) {
    return "STOP MULTITASKING. FOCUS ON ONE THING.";
  }
  
  if (todoCount > 8) {
    return "YOU ARE HOARDING TASKS. DELETE SOME OR DO THEM.";
  }
  
  if (completedCount > 5) {
    return "YOU'RE ON FIRE. KEEP PUSHING.";
  }
  
  return "STATUS: OPERATIONAL";
}

