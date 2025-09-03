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

    console.log('Using nano-banana model for background removal');
    
    // Single optimized prompt for background removal
    const prompt = "Remove the background completely and make it transparent. Keep all people, objects, animals, and clothing intact with clean edges. Preserve all details including hair, accessories, and clothing textures.";
    
    // Call the nano-banana model with the background removal prompt
    const response = await fetch('https://api.replicate.com/v1/models/google/nano-banana/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          image_input: [imageData],
          output_format: "png"
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
    console.log('Background removal initial result:', result);

    // Wait for completion with timeout
    let finalResult = result;
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (finalResult.status !== 'succeeded' && finalResult.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(finalResult.urls.get, {
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
        }
      });
      
      if (statusResponse.ok) {
        finalResult = await statusResponse.json();
        console.log(`Background removal status check ${attempts + 1}:`, finalResult.status);
      }
      
      attempts++;
    }

    if (finalResult.status === 'failed') {
      console.error('Background removal prediction failed:', finalResult.error);
      return NextResponse.json(
        { error: 'Background removal failed: ' + finalResult.error },
        { status: 500 }
      );
    }

    if (finalResult.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Background removal timed out' },
        { status: 500 }
      );
    }

    // Get the generated image URL
    let generatedImageUrl;
    if (Array.isArray(finalResult.output)) {
      generatedImageUrl = finalResult.output[0];
    } else if (typeof finalResult.output === 'string') {
      generatedImageUrl = finalResult.output;
    } else {
      generatedImageUrl = finalResult.output;
    }

    console.log('Generated image URL:', generatedImageUrl);

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // 🔄 TEMPORARY URL - Background removal is intermediate edit, not final design
    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl, // Keep as temporary Replicate URL for intermediate edits
      method: 'nano-banana-background-removal'
    });

  } catch (error) {
    console.error('Background removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error during background removal' },
      { status: 500 }
    );
  }
} 