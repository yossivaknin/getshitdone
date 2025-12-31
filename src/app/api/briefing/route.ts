import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTasks } from '@/app/actions';

export async function GET(request: Request) {
  return handleBriefing(request);
}

export async function POST(request: Request) {
  return handleBriefing(request);
}

async function handleBriefing(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    console.log('[BRIEFING API] Checking for API key...');
    console.log('[BRIEFING API] API key exists:', !!apiKey);
    console.log('[BRIEFING API] API key preview:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    
    if (!apiKey) {
      console.error('[BRIEFING API] ❌ Gemini API key not configured');
      return NextResponse.json(
        { error: 'Gemini API key not configured. Please add GOOGLE_GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    console.log('[BRIEFING API] Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // First, list available models to find one that works
    console.log('[BRIEFING API] Listing available models...');
    let availableModels: any[] = [];
    let modelName = '';
    
    // Define the correct available models (in order of preference)
    const correctModels = ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro'];
    
    try {
      console.log('[BRIEFING API] Calling listModels()...');
      const modelsResponse = await genAI.listModels();
      console.log('[BRIEFING API] listModels() response:', JSON.stringify(modelsResponse, null, 2));
      
      // Check if response has models property or if it's an array
      if (Array.isArray(modelsResponse)) {
        availableModels = modelsResponse;
      } else if (modelsResponse.models) {
        availableModels = modelsResponse.models;
      } else if (modelsResponse.data && Array.isArray(modelsResponse.data)) {
        availableModels = modelsResponse.data;
      } else {
        console.warn('[BRIEFING API] Unexpected listModels() response format:', modelsResponse);
        availableModels = [];
      }
      
      console.log(`[BRIEFING API] Found ${availableModels.length} available models`);
      if (availableModels.length > 0) {
        console.log('[BRIEFING API] Available model names:', availableModels.map((m: any) => m.name || m));
      }
      
      // Find a model that supports generateContent
      // Model names might be in format: "models/gemini-pro" or just "gemini-pro"
      const supportedModel = availableModels.find((m: any) => {
        const methods = m.supportedGenerationMethods || [];
        const name = m.name || m;
        return (methods.includes('generateContent') || 
               methods.includes('GENERATE_CONTENT') ||
               methods.length > 0) && // If it has any methods, try it
               name && name.includes('gemini'); // Make sure it's a gemini model
      });
      
      if (supportedModel) {
        // Extract model name (format: models/gemini-pro or just gemini-pro)
        const fullName = supportedModel.name || supportedModel;
        const extractedName = fullName.replace(/^models\//, '');
        
        // Check if the extracted name is one of our correct models
        if (correctModels.includes(extractedName)) {
          modelName = extractedName;
          console.log(`[BRIEFING API] Using model: ${modelName} (from available models)`);
        } else {
          // If listModels returned an old model, use our correct models instead
          modelName = correctModels[0];
          console.log(`[BRIEFING API] ListModels returned old model (${extractedName}), using correct model: ${modelName}`);
        }
        console.log(`[BRIEFING API] Model display name: ${supportedModel.displayName || 'N/A'}`);
        console.log(`[BRIEFING API] Supported methods: ${(supportedModel.supportedGenerationMethods || []).join(', ')}`);
      } else {
        // Fallback: use our correct models
        modelName = correctModels[0];
        console.log(`[BRIEFING API] No supported model found, using: ${modelName}`);
      }
    } catch (listError: any) {
      console.error('[BRIEFING API] Failed to list models:', listError);
      console.error('[BRIEFING API] Error details:', listError.message);
      console.error('[BRIEFING API] Error stack:', listError.stack);
      // Fallback to correct models
      modelName = correctModels[0];
      console.log(`[BRIEFING API] Using fallback model: ${modelName}`);
    }
    
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`[BRIEFING API] Model initialized: ${modelName}`);

    // Fetch real data from database
    console.log('[BRIEFING API] Fetching real tasks and calendar events...');
    
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[BRIEFING API] Not authenticated:', userError);
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch real tasks from database
    const tasksResult = await getTasks();
    if (tasksResult.error) {
      console.error('[BRIEFING API] Error fetching tasks:', tasksResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const tasks = tasksResult.tasks || [];
    console.log(`[BRIEFING API] Found ${tasks.length} tasks`);

    // Filter to active tasks (not done)
    const activeTasks = tasks.filter((task: any) => {
      const status = task.status || task.list_id;
      return status !== 'done' && status !== 'shipped';
    });
    console.log(`[BRIEFING API] ${activeTasks.length} active tasks (excluding done)`);

    // Fetch calendar events from Google Calendar (if token available)
    let eventsByDay: Record<string, Array<{ time: string; title: string; duration: number }>> = {};
    
    try {
      // Try to get access token from request body (POST) or skip (GET)
      let accessToken: string | null = null;
      
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          accessToken = body.accessToken || null;
        } catch {
          // No body or invalid JSON, continue without token
        }
      }
      
      if (accessToken) {
        console.log('[BRIEFING API] Fetching calendar events with provided token...');
        
        // Get this week's events (from today through end of week - Sunday)
        const now = new Date();
        const timeMin = now.toISOString();
        
        // Calculate end of week (Sunday at 23:59:59)
        const endOfWeek = new Date(now);
        const daysUntilSunday = 7 - endOfWeek.getDay(); // 0 = Sunday, so if today is Sunday, daysUntilSunday = 0
        endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
        endOfWeek.setHours(23, 59, 59, 999);
        const timeMax = endOfWeek.toISOString();
        
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          `timeMin=${encodeURIComponent(timeMin)}&` +
          `timeMax=${encodeURIComponent(timeMax)}&` +
          `maxResults=100&` +
          `orderBy=startTime&` +
          `singleEvents=true`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json();
          const events = calendarData.items || [];
          
          // Format events for AI prompt - group by day
          events
            .filter((event: any) => {
              // Exclude [Focus] events created by the app itself
              return !event.summary?.includes('[Focus]');
            })
            .forEach((event: any) => {
              const start = new Date(event.start?.dateTime || event.start?.date);
              const end = new Date(event.end?.dateTime || event.end?.date);
              const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
              
              // Format time as HH:MM
              const hours = start.getHours();
              const minutes = start.getMinutes();
              const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              
              // Get day name (Monday, Tuesday, etc.)
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayName = dayNames[start.getDay()];
              
              if (!eventsByDay[dayName]) {
                eventsByDay[dayName] = [];
              }
              
              eventsByDay[dayName].push({
                time: timeStr,
                title: event.summary || 'Untitled Event',
                duration: duration
              });
            });
          
          // Sort events within each day by time
          Object.keys(eventsByDay).forEach(day => {
            eventsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
          });
          
          const totalEvents = Object.values(eventsByDay).flat().length;
          console.log(`[BRIEFING API] Found ${totalEvents} calendar events for this week`);
          console.log(`[BRIEFING API] Events by day:`, Object.keys(eventsByDay).map(day => `${day}: ${eventsByDay[day].length}`).join(', '));
        } else {
          console.warn('[BRIEFING API] Could not fetch calendar events (token may be invalid)');
        }
      } else {
        console.log('[BRIEFING API] No access token provided, skipping calendar events');
      }
    } catch (calendarError) {
      console.warn('[BRIEFING API] Could not fetch calendar events:', calendarError);
      // Continue without calendar events
    }

    // Format tasks for AI
    const formatTaskPriority = (task: any): string => {
      // Determine priority based on due date and status
      if (!task.dueDate) return 'low';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) return 'high'; // Overdue
      if (daysDiff === 0) return 'high'; // Due today
      if (daysDiff <= 1) return 'high'; // Due tomorrow
      if (daysDiff <= 7) return 'medium'; // Due this week
      return 'low'; // Due later
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

    // Format calendar events by day for better context
    let calendarText = '';
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    if (Object.keys(eventsByDay).length > 0) {
      // Format events grouped by day
      const formattedDays = dayOrder
        .filter(day => eventsByDay[day] && eventsByDay[day].length > 0)
        .map(day => {
          const events = eventsByDay[day];
          const eventsList = events
            .map(e => `    ${e.time} - ${e.title} (${e.duration} min)`)
            .join('\n');
          return `  ${day}:\n${eventsList}`;
        });
      
      calendarText = formattedDays.join('\n');
    } else {
      calendarText = '  No calendar events this week (calendar not connected or week is clear)';
    }
    
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

    // Debug: Log what we're sending to AI
    console.log('[BRIEFING API] Tasks being sent to AI:', activeTasks.map((t: any) => t.title));
    console.log('[BRIEFING API] Calendar events count:', Object.values(eventsByDay).flat().length);
    console.log('[BRIEFING API] Tasks text preview:', tasksText.substring(0, 200));

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

    // Log the full prompt being sent to Gemini for debugging
    console.log('[BRIEFING API] ========== FULL PROMPT BEING SENT TO GEMINI ==========');
    console.log(systemPrompt);
    console.log('[BRIEFING API] ======================================================');
    
    console.log(`[BRIEFING API] Generating content with Gemini using model: ${modelName}...`);
    let result;
    let lastError: any = null;
    
    // Try generating with the selected model, with fallback to other correct models if it fails
    const fallbackModels = [modelName, ...correctModels];
    const uniqueModels = [...new Set(fallbackModels)]; // Remove duplicates
    console.log(`[BRIEFING API] Will try models in order: ${uniqueModels.join(', ')}`);
    
    for (let i = 0; i < uniqueModels.length; i++) {
      try {
        const currentModel = genAI.getGenerativeModel({ model: uniqueModels[i] });
        result = await currentModel.generateContent(systemPrompt);
        modelName = uniqueModels[i];
        console.log(`[BRIEFING API] Successfully generated content with: ${modelName}`);
        break;
      } catch (modelError: any) {
        console.error(`[BRIEFING API] Model ${uniqueModels[i]} failed:`, modelError.message);
        lastError = modelError;
        if (i === uniqueModels.length - 1) {
          // Last model failed, throw error
          throw new Error(`All models failed. Tried: ${uniqueModels.join(', ')}. Last error: ${modelError.message}`);
        }
        continue;
      }
    }
    
    const response = await result.response;
    const text = response.text();
    console.log('[BRIEFING API] Received response from Gemini (length:', text.length, 'chars)');

    // Extract JSON from response (handle cases where AI adds markdown)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    // Remove any leading/trailing text that's not JSON
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    console.log('[BRIEFING API] Parsing JSON response...');
    const briefing = JSON.parse(jsonText);
    console.log('[BRIEFING API] Parsed briefing:', {
      readinessScore: briefing.readinessScore,
      headline: briefing.headline,
      tacticalPointsCount: briefing.tacticalPoints?.length
    });

    // Validate response structure
    if (
      typeof briefing.readinessScore !== 'number' ||
      typeof briefing.headline !== 'string' ||
      !Array.isArray(briefing.tacticalPoints)
    ) {
      console.error('[BRIEFING API] ❌ Invalid response format:', briefing);
      throw new Error('Invalid response format from AI');
    }

    console.log('[BRIEFING API] ✅ Returning briefing successfully');
    return NextResponse.json(briefing);
  } catch (error: any) {
    console.error('[BRIEFING API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate briefing', details: error.message },
      { status: 500 }
    );
  }
}

