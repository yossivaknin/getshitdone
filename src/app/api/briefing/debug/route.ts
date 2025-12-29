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
    const models = await genAI.listModels();
    const modelNames = models.map((model: any) => ({
      name: model.name,
      displayName: model.displayName,
      supportedGenerationMethods: model.supportedGenerationMethods
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

