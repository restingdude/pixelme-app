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

    // Embroidery-style conversion prompt focused on color preservation
    const prompt = `Create an embroidery patch style version with these STRICT requirements:

ABSOLUTE COLOR PRESERVATION (MOST IMPORTANT):
- WHITE must stay WHITE (never orange, yellow, or any other color)
- LIGHT BROWN must stay LIGHT BROWN (never blue, purple, or any other color)  
- EVERY original color must maintain its exact hue family
- If something is red in original, it MUST be red in result
- If something is blue in original, it MUST be blue in result
- ZERO color shifting or color changes allowed

STYLE REQUIREMENTS:
1. Add EXTREMELY THICK BLACK OUTLINES around ALL shapes and characters - outlines should be MASSIVE and BOLD like drawn with a thick black marker, similar to cartoon coloring books or iron-on patches with heavy black stitching
2. Flatten areas to solid colors (remove gradients and shading)
3. Reduce to maximum 15 distinct colors while preserving original hues
4. Make colors vibrant like embroidery thread but keep same color families
5. CRITICAL: Keep all transparent/clear background areas completely transparent - never add any background color or fill transparent areas

TRANSPARENCY PRESERVATION (ESSENTIAL):
- Transparent backgrounds MUST stay completely transparent
- Do not add any background color, patterns, or fills to transparent areas
- Preserve the alpha channel exactly as it is in the original
- Only process visible subject elements, never the transparent background

OUTLINE EMPHASIS: The black outlines are the most important visual feature - they should be so thick and prominent that they dominate the image like a bold cartoon or embroidery patch. Think thick marker lines, not thin pen lines.

CRITICAL: This is color quantization, NOT color transformation. Keep all original colors exactly as they are, just reduce the number of variations and add EXTREMELY thick black outlines.`;

    // Negative prompt to prevent color changes, ensure thick outlines, and preserve transparency
    const negativePrompt = `color changes, color shifting, white to orange, white to yellow, brown to blue, brown to purple, red to blue, blue to red, wrong colors, different colors, altered hues, color transformation, recoloring, color replacement, hue shifting, tint changes, saturation changes that alter color family, color inversion, complementary colors, opposite colors, thin outlines, fine outlines, hairline outlines, delicate outlines, subtle outlines, minimal outlines, thin lines, fine lines, subtle borders, pencil lines, pen lines, light strokes, faded outlines, weak borders, gradients, shading, soft edges, background filling, background colors, background patterns, solid background, filled background, opaque background, removing transparency, adding background, background replacement`;

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
          // Conservative parameters to preserve original colors
          guidance_scale: 8.0,  // Lower guidance for less dramatic changes
          num_inference_steps: 30,  // Sufficient steps for quality
          strength: 0.65  // Lower strength to preserve original colors while adding outlines
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