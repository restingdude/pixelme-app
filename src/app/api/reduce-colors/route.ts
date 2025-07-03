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

    // Accept both data URLs and HTTP URLs
    if (!imageData.startsWith('data:image/') && !imageData.startsWith('http')) {
      console.error('Invalid imageData format. Expected data URL or HTTP URL, got:', imageData.substring(0, 100));
      return NextResponse.json(
        { error: 'Invalid image data format. Expected data URL or HTTP URL.' },
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

    console.log('Processing color reduction for image data length:', imageData.length);
    console.log('Image data format:', imageData.substring(0, 50) + '...');

    // Embroidery-style conversion prompt optimized for digitization
    const prompt = `Convert ALL characters and subjects in this image to an ULTRA FLAT, ULTRA BLOCKY embroidery-ready style using exactly 10 colors or fewer. DO NOT convert the background - especially any light gray and dark gray checkered patterns or neutral backgrounds. Keep all background areas completely unchanged and untouched. ABSOLUTE ZERO SHADING - ELIMINATE ALL forms of shading, gradients, highlights, shadows, soft transitions, color variations, tonal differences, and artistic depth. Every single area must be ONE SINGLE FLAT COLOR with no variation whatsoever. BLACK LINES ARE THE ONLY SHADING - use MASSIVE, THICK BLACK OUTLINES (5-6 pixels wide) around every shape, character, and feature. Add HEAVY black lines inside characters for ALL definition - facial features, clothing details, hair strands, body separation. BLACK LINES replace ALL shading and depth - no color-based shading allowed AT ALL. Make it EXTREMELY blocky and geometric like the simplest possible coloring book with the THICKEST black outlines and FLATTEST colors imaginable. Think basic cartoon sticker style with massive black borders everywhere. ZERO artistic subtlety - only bold geometric shapes with massive black line separation. Ultra-simplified embroidery style with no complex color work whatsoever, while leaving the background completely untouched.`;

    // Use FLUX Kontext Pro for high-quality color reduction
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          input_image: imageData,
          prompt: prompt,
          output_format: "png",
          output_quality: 95,
          // Additional parameters for better color control
          guidance_scale: 3.5,
          num_inference_steps: 28
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Replicate API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to process image with Replicate API' },
        { status: response.status }
      );
    }

    const prediction = await response.json();

    // Poll for completion (Replicate predictions are async)
    let result = prediction;
    while (result.status === 'starting' || result.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
        },
      });
      
      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }
      
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      console.error('Replicate prediction failed:', result.error);
      return NextResponse.json(
        { error: `Color reduction failed: ${result.error || 'Unknown error'}` },
        { status: 500 }
      );
    }

    if (result.status !== 'succeeded') {
      console.error('Unexpected prediction status:', result.status);
      return NextResponse.json(
        { error: `Unexpected status: ${result.status}` },
        { status: 500 }
      );
    }

    // Handle different output formats
    let generatedImageUrl;
    if (Array.isArray(result.output)) {
      generatedImageUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      generatedImageUrl = result.output;
    } else {
      generatedImageUrl = result.output;
    }

    console.log('Color reduction result:', result);
    console.log('Generated URL:', generatedImageUrl);

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // Validate that the generated URL is accessible
    try {
      const urlCheck = await fetch(generatedImageUrl, { method: 'HEAD' });
      if (!urlCheck.ok) {
        console.error('Generated image URL is not accessible:', urlCheck.status);
        return NextResponse.json(
          { error: `Generated image is not accessible (${urlCheck.status})` },
          { status: 500 }
        );
      }
    } catch (urlError) {
      console.error('Error checking generated image URL:', urlError);
      return NextResponse.json(
        { error: 'Generated image URL is not accessible' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl
    });

  } catch (error) {
    console.error('Color reduction error:', error);
    return NextResponse.json(
      { error: 'Internal server error during color reduction' },
      { status: 500 }
    );
  }
} 