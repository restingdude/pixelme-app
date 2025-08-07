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
    const prompt = `Transform this into EMBROIDERY PATCH STYLE with ULTRA-THICK BLACK BORDERS:

1. CRITICAL COLOR PRESERVATION - EXACTLY maintain these specific colors:
   - SKIN TONES: Keep the exact skin color from original (pale, medium, dark, olive, etc.) - do NOT change skin tone at all
   - HAIR COLORS: Preserve exact hair color (blonde, brown, black, red, gray, etc.) - maintain the specific shade
   - CLOTHING COLORS: Keep exact clothing colors (red shirt stays red, blue jeans stay blue, etc.)
   - EYE COLORS: Maintain original eye colors (brown, blue, green, hazel, etc.)
   - ALL OTHER COLORS: Preserve the original color family for every element

2. SMART COLOR REDUCTION to maximum 15 thread colors:
   - Group similar shades within each color family (light blue + dark blue = one blue thread)
   - Keep one representative color per major element (one skin tone, one hair color, one shirt color, etc.)
   - Maintain color relationships and contrast between different elements

3. FLAT COLOR AREAS - Remove gradients and shading, fill each area with solid flat colors matching original hues

4. MASSIVE BLACK OUTLINES - Create ULTRA-THICK BLACK BORDERS around EVERY shape and element. The black outlines should be the DOMINANT feature - like iron-on patches or embroidered badges with heavy black stitching around every edge. Make outlines so thick they look like they were drawn with a fat marker.

5. EMBROIDERY THREAD SIMULATION - Make colors look like embroidery thread: vibrant, saturated, but true to original colors

6. PRESERVE TRANSPARENCY - Keep transparent backgrounds completely transparent

CRITICAL: This must look like a colorful embroidery patch where someone could easily identify the original colors of skin, hair, clothes, etc. Never change the basic color identity of any element - a red shirt must stay red, brown hair must stay brown, etc.`;

    // Negative prompt to avoid thin outlines and color changes
    const negativePrompt = `thin outlines, fine lines, delicate borders, subtle edges, minimal outlines, pencil lines, hairline borders, light strokes, faded edges, color changes, skin color changes, hair color changes, clothing color changes, monochrome, black and white, desaturated colors, wrong colors, color shifting`;

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
          negative_prompt: negativePrompt,
          output_format: "png",
          output_quality: 95,
          // Aggressive parameters for maximum outline thickness
          guidance_scale: 12.0,  // Much higher for strict prompt adherence
          num_inference_steps: 35,  // More steps for better quality
          strength: 0.95  // Very high strength for dramatic changes
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