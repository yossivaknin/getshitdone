import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // List all available models
    console.log('[DEBUG] Calling listModels()...');
    let modelsResponse;
    try {
      modelsResponse = await genAI.listModels();
      console.log('[DEBUG] listModels() response type:', typeof modelsResponse);
      console.log('[DEBUG] listModels() response:', JSON.stringify(modelsResponse, null, 2));
    } catch (error: any) {
      console.error('[DEBUG] listModels() error:', error);
      return NextResponse.json({
        error: 'Failed to call listModels()',
        details: error.message,
        stack: error.stack
      }, { status: 500 });
    }
    
    // Handle different response formats
    let models: any[] = [];
    if (Array.isArray(modelsResponse)) {
      models = modelsResponse;
    } else if (modelsResponse.models) {
      models = modelsResponse.models;
    } else if (modelsResponse.data && Array.isArray(modelsResponse.data)) {
      models = modelsResponse.data;
    } else {
      models = [];
    }
    
    const modelNames = models.map((model: any) => ({
      name: model.name || model,
      displayName: model.displayName || 'N/A',
      supportedGenerationMethods: model.supportedGenerationMethods || []
    }));

    return NextResponse.json({
      total: modelNames.length,
      models: modelNames,
      message: 'Available Gemini models'
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to list models', 
        details: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}

