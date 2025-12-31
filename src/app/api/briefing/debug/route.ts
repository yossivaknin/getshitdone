import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTasks } from '@/app/actions';

export async function GET() {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch real tasks from database
    const tasksResult = await getTasks();
    if (tasksResult.error) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const tasks = tasksResult.tasks || [];
    const activeTasks = tasks.filter((task: any) => {
      const status = task.status || task.list_id;
      return status !== 'done' && status !== 'shipped';
    });

    // Format tasks
    const formatTaskPriority = (task: any): string => {
      if (!task.dueDate) return 'low';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) return 'high';
      if (daysDiff === 0) return 'high';
      if (daysDiff <= 1) return 'high';
      if (daysDiff <= 7) return 'medium';
      return 'low';
    };

    const formatDueDate = (dueDate: string | undefined): string => {
      if (!dueDate) return 'no due date';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 0) return `${Math.abs(daysDiff)} days overdue`;
      if (daysDiff === 0) return 'today';
      if (daysDiff === 1) return 'tomorrow';
      if (daysDiff <= 7) return `in ${daysDiff} days`;
      return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const tasksText = activeTasks.length > 0
      ? activeTasks
          .map((t: any) => {
            const priority = formatTaskPriority(t);
            const dueDate = formatDueDate(t.dueDate);
            const duration = t.duration ? ` (${t.duration} min)` : '';
            return `  - [${priority.toUpperCase()}] ${t.title}${duration} (Due: ${dueDate})`;
          })
          .join('\n')
      : '  No active tasks';

    const calendarText = '  No calendar events this week (calendar not connected or week is clear)';

    const systemPrompt = `You are a business productivity advisor analyzing the user's WEEK. Provide practical, actionable insights about their schedule and tasks.

THIS WEEK'S CALENDAR EVENTS:
${calendarText}

ACTIVE TASKS:
${tasksText}

Your task:

1. Calculate READINESS SCORE (0-100) for the WEEK:
   - 90-100: Week looks manageable. Good balance of meetings and open time.
   - 50-89: Moderate week. Some busy days, but workable with planning.
   - 0-49: Heavy week. Very full schedule, limited flexibility.

2. Generate HEADLINE (Max 5 words):
   - Direct, practical, business language
   - Good examples: "Week Looks Full - Plan Ahead", "Friday Has Open Time", "Heavy Monday - Light Friday"
   - BAD examples: "CRITICAL TIMELINE COMPRESSION", "OPERATIONAL WINDOW", "TACTICAL SITUATION"

3. Provide 3-4 INSIGHTS (starting with '> '):
   - Analyze the WEEK as a whole - which days are busiest, which have open time
   - Reference the ACTUAL tasks from the list above by their exact titles
   - Give practical advice about the week's schedule
   - Use business/productivity language, NOT military language

CRITICAL LANGUAGE RULES:
- NEVER use: "operational", "sector", "neutralize", "embargo", "concentrate fire", "execute", "main effort", "terminates", "targets"
- DO use: "focus on", "work on", "schedule", "plan", "prioritize", "defer", "complete", "finish"
- Reference actual task titles from the list above
- Talk about days of the week (Monday, Tuesday, etc.) and time windows (9am-12pm, etc.)

GOOD INSIGHT EXAMPLES:
- "Your week seems full, try not to push tasks. If you have to, Friday seems a bit open but don't wait until the last moment."
- "Monday and Wednesday are heavy with meetings. Tuesday afternoon (2pm-5pm) looks like your best window for deep work on [Task Name]."
- "You have 5 tasks due this week but only 2 open blocks. Consider deferring [Task Name] to next week."

BAD INSIGHT EXAMPLES (DO NOT USE):
- "Execute main effort on Auth Refactor during the 1200-1400 operational window"
- "Neutralize Calendar Bug immediately in the 0930-1100 sector"
- "Embargo all low-priority targets; concentrate fire strictly on 'Due Today' objectives"

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
"readinessScore": number,
"headline": "string",
"tacticalPoints": ["string", "string", "string"]
}`;

    return NextResponse.json({
      tasksCount: activeTasks.length,
      tasks: activeTasks.map((t: any) => ({
        title: t.title,
        dueDate: t.dueDate,
        duration: t.duration,
        priority: formatTaskPriority(t),
        formattedDueDate: formatDueDate(t.dueDate)
      })),
      tasksText,
      calendarText,
      fullPrompt: systemPrompt
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to generate debug info', details: error.message },
      { status: 500 }
    );
  }
}
