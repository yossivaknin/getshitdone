import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Mock calendar events
const calendarEvents = [
  { time: '09:00', title: 'Standup', duration: 30 },
  { time: '11:00', title: 'Client Review', duration: 60 },
  { time: '14:00', title: 'Team Sync', duration: 45 },
  { time: '16:00', title: 'Sprint Planning', duration: 90 },
];

// Mock active tasks
const activeTasks = [
  { title: 'Refactor authentication module', priority: 'high', dueDate: 'today' },
  { title: 'Update API documentation', priority: 'medium', dueDate: 'tomorrow' },
  { title: 'Fix calendar sync bug', priority: 'high', dueDate: 'today' },
  { title: 'Design new dashboard UI', priority: 'low', dueDate: 'next week' },
];

export async function GET() {
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
    
    // Use the latest model names - these should work with the current API
    // Try gemini-1.5-pro-latest first (most capable), fallback to gemini-1.5-flash-latest (faster)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-pro-latest' 
    });
    console.log('[BRIEFING API] Model initialized: gemini-1.5-pro-latest');

    // Format mock data for AI
    const calendarText = calendarEvents
      .map(e => `  ${e.time} - ${e.title} (${e.duration} min)`)
      .join('\n');
    
    const tasksText = activeTasks
      .map(t => `  - [${t.priority.toUpperCase()}] ${t.title} (Due: ${t.dueDate})`)
      .join('\n');

    const systemPrompt = `You are a military Operations Officer analyzing a tactical situation report (SITREP). 

Analyze the following schedule and task list to provide a strategic briefing:

CALENDAR EVENTS:
${calendarText}

ACTIVE TASKS:
${tasksText}

Your mission:
1. Calculate a READINESS SCORE (0-100) based on:
   - Free time availability between meetings
   - Task volume vs available time
   - Meeting density (too many meetings = lower score)
   - High priority tasks vs available time

2. Generate a tactical HEADLINE (short, military-style, max 5 words)

3. Provide 3-5 TACTICAL POINTS (each starting with "> ") that include:
   - Time windows for deep work
   - Warnings about heavy meeting loads
   - Task prioritization recommendations
   - Strategic advice for the day

CRITICAL: You MUST respond with ONLY valid JSON in this exact format:
{
  "readinessScore": <number 0-100>,
  "headline": "<short tactical summary>",
  "tacticalPoints": [
    "> <point 1>",
    "> <point 2>",
    "> <point 3>"
  ]
}

Do NOT include any markdown formatting, code blocks, or explanatory text. ONLY the JSON object.`;

    console.log('[BRIEFING API] Generating content with Gemini...');
    const result = await model.generateContent(systemPrompt);
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

