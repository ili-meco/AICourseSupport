import { NextRequest, NextResponse } from 'next/server';

/**
 * API route handler for chat completions
 * Proxies requests to the FastAPI backend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // FastAPI URL
    // In production, this should be read from environment variables
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    
    // Forward request to FastAPI backend
    const response = await fetch(`${apiUrl}/api/ChatCompletion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from API:', errorText);
      return NextResponse.json(
        { error: 'Failed to get response from chat API' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chat completion API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
