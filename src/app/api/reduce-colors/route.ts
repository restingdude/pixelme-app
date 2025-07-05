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

    // Embroidery-style conversion prompt optimized for color preservation and digitization
    const prompt = `Convert this image to embroidery-ready style with these EXACT requirements:

1. PRESERVE ALL ORIGINAL COLORS - Keep red, blue, green, yellow, purple, orange, pink, brown, skin tones, hair colors, and ALL other existing colors in the image
2. REDUCE to maximum 15 colors total - simplify similar shades but KEEP the original color families
3. FLAT COLOR AREAS - Remove gradients and shading, fill each area with solid flat colors
4. THICK BLACK OUTLINES - Add bold black outlines (8-10 pixels wide) around the exterior edges and important interior features
5. DO NOT convert to black and white - This must remain a COLORFUL image with all original color types preserved

Transform the style to look like embroidery stitching while maintaining vibrant colors. Keep background unchanged if it's transparent or checkered. Focus on making the main subject bold and colorful with thick outlines suitable for embroidery digitization.

CRITICAL: This must be a COLORFUL result, not black and white. Preserve the color palette while simplifying it to 15 colors maximum.`;

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