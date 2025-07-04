import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing required field: imageData' },
        { status: 400 }
      );
    }

    const replicateApiKey = process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      return NextResponse.json(
        { error: 'Replicate API key not configured. Please add REPLICATE_API_TOKEN to your environment variables.' },
        { status: 500 }
      );
    }

    console.log('Using 851-labs/background-remover model');
    
    // Call the background remover model directly with base64 image
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
        input: {
          image: imageData // Send base64 data directly
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Background removal API error:', errorData);
      return NextResponse.json(
        { error: 'Background removal failed: ' + (errorData.detail || errorData.title || 'Unknown error') },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Background removal result:', result);

    // Handle the result - with Prefer: wait, we should get the final result immediately
    if (result.status === 'failed') {
      console.error('Background removal prediction failed:', result.error);
      return NextResponse.json(
        { error: 'Background removal failed: ' + result.error },
        { status: 500 }
      );
    }

    // Get the generated image URL
    let generatedImageUrl;
    if (Array.isArray(result.output)) {
      generatedImageUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      generatedImageUrl = result.output;
    } else {
      generatedImageUrl = result.output;
    }

    console.log('Generated image URL:', generatedImageUrl);

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      method: '851-labs-background-remover'
    });

  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error during background removal' },
      { status: 500 }
    );
  }
} 