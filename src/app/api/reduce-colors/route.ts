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

NO OUTLINES RULE (ABSOLUTELY CRITICAL):
- NEVER add any outlines, borders, or lines of any kind
- NO black outlines, NO colored outlines, NO thin lines, NO thick lines
- NO cartoon-style borders or embroidery stitching lines
- Keep edges clean and natural without any added borders
- FORBIDDEN: Any form of outlining, bordering, or line drawing

STYLE REQUIREMENTS:
1. Flatten areas to solid colors (remove gradients and shading)
2. Reduce to maximum 15 distinct colors while preserving original hues
3. Make colors vibrant like embroidery thread but keep same color families
4. CRITICAL: Keep all transparent/clear background areas completely transparent - never add any background color or fill transparent areas

TRANSPARENCY PRESERVATION (ESSENTIAL):
- Transparent backgrounds MUST stay completely transparent
- Do not add any background color, patterns, or fills to transparent areas
- Preserve the alpha channel exactly as it is in the original
- Only process visible subject elements, never the transparent background

CRITICAL: This is ONLY color quantization - reduce color variations while maintaining natural edges. ABSOLUTELY NO OUTLINES OR BORDERS OF ANY KIND.`;

    // Negative prompt to aggressively prevent any outlines, color changes, and preserve transparency
    const negativePrompt = `OUTLINES, BORDERS, LINES, BLACK OUTLINES, THICK OUTLINES, THIN OUTLINES, FINE OUTLINES, HAIRLINE OUTLINES, DELICATE OUTLINES, SUBTLE OUTLINES, MINIMAL OUTLINES, CARTOON OUTLINES, EMBROIDERY STITCHING, MARKER LINES, PEN LINES, PENCIL LINES, LIGHT STROKES, FADED OUTLINES, WEAK BORDERS, SUBTLE BORDERS, EDGE LINES, CONTOUR LINES, STROKE OUTLINES, BOUNDARY LINES, PERIMETER LINES, SILHOUETTE LINES, DRAWN LINES, SKETCHED LINES, TRACED LINES, OUTLINED EDGES, BORDERED SHAPES, LINE ART, VECTOR LINES, COMIC BOOK OUTLINES, ANIMATION OUTLINES, CHARACTER OUTLINES, FIGURE OUTLINES, SHAPE OUTLINES, OBJECT OUTLINES, color changes, color shifting, white to orange, white to yellow, brown to blue, brown to purple, red to blue, blue to red, wrong colors, different colors, altered hues, color transformation, recoloring, color replacement, hue shifting, tint changes, saturation changes that alter color family, color inversion, complementary colors, opposite colors, gradients, shading, soft edges, background filling, background colors, background patterns, solid background, filled background, opaque background, removing transparency, adding background, background replacement`;

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