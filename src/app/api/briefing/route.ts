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
    
    // First, list available models to find one that works
    console.log('[BRIEFING API] Listing available models...');
    let availableModels: any[] = [];
    let modelName = '';
    
    try {
      const modelsResponse = await genAI.listModels();
      availableModels = modelsResponse.models || [];
      console.log(`[BRIEFING API] Found ${availableModels.length} available models`);
      console.log('[BRIEFING API] Available model names:', availableModels.map((m: any) => m.name));
      
      // Find a model that supports generateContent
      // Model names might be in format: "models/gemini-pro" or just "gemini-pro"
      const supportedModel = availableModels.find((m: any) => {
        const methods = m.supportedGenerationMethods || [];
        return methods.includes('generateContent') || 
               methods.includes('GENERATE_CONTENT') ||
               methods.length > 0; // If it has any methods, try it
      });
      
      if (supportedModel) {
        // Extract model name (format: models/gemini-pro or just gemini-pro)
        modelName = supportedModel.name.replace(/^models\//, '');
        console.log(`[BRIEFING API] Using model: ${modelName} (from available models)`);
        console.log(`[BRIEFING API] Model display name: ${supportedModel.displayName || 'N/A'}`);
        console.log(`[BRIEFING API] Supported methods: ${(supportedModel.supportedGenerationMethods || []).join(', ')}`);
      } else {
        // Fallback: try the first available model
        if (availableModels.length > 0) {
          modelName = availableModels[0].name.replace(/^models\//, '');
          console.log(`[BRIEFING API] Using first available model: ${modelName}`);
        } else {
          // Last resort: try common model names
          const fallbackModels = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
          modelName = fallbackModels[0];
          console.log(`[BRIEFING API] No models in list, using fallback: ${modelName}`);
        }
      }
    } catch (listError: any) {
      console.error('[BRIEFING API] Failed to list models:', listError);
      console.error('[BRIEFING API] Error details:', listError.message);
      // Fallback to gemini-pro
      modelName = 'gemini-pro';
      console.log(`[BRIEFING API] Using fallback model: ${modelName}`);
    }
    
    const model = genAI.getGenerativeModel({ model: modelName });
    console.log(`[BRIEFING API] Model initialized: ${modelName}`);

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

    console.log(`[BRIEFING API] Generating content with Gemini using model: ${modelName}...`);
    let result;
    
    // Try generating with current model, fallback to others if it fails
    for (let i = 0; i < modelNames.length; i++) {
      try {
        const currentModel = genAI.getGenerativeModel({ model: modelNames[i] });
        result = await currentModel.generateContent(systemPrompt);
        modelName = modelNames[i];
        console.log(`[BRIEFING API] Successfully generated content with: ${modelName}`);
        break;
      } catch (modelError: any) {
        console.error(`[BRIEFING API] Model ${modelNames[i]} failed:`, modelError.message);
        lastError = modelError;
        if (i === modelNames.length - 1) {
          // Last model failed, throw error
          throw new Error(`All models failed. Tried: ${modelNames.join(', ')}. Last error: ${modelError.message}`);
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

