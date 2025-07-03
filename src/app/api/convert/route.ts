import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData, style, clothing } = await request.json();

    if (!imageData || !style || !clothing) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData, style, or clothing' },
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

    const getStyleSpecificPrompt = (style: string) => {
      switch (style) {
        case 'Simpsons':
          return 'Convert this person into The Simpsons cartoon style: bright yellow cartoon skin, large white circular eyes with small black pupils, thick black outlines around character, round cartoon head, flat 2D animation style exactly like the TV show. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE AND TEXTURE - curly stays curly, straight stays straight, long stays long, short stays short. MAINTAIN ORIGINAL SKIN TONE CHARACTERISTICS while applying Simpsons yellow tint. PRESERVE from original image: same facial expression (smiling, serious, etc.), same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Keep 4-finger hands, simple solid colored clothing with black outlines. Maintain same age and gender. Focus on perfect Simpsons character art style while preserving all background elements.';

        case 'Studio Ghibli':
          return 'Convert this person into Studio Ghibli anime style: large expressive anime eyes with detailed iris, soft watercolor shading, gentle lighting, hand-drawn animation style exactly like Spirited Away or Princess Mononoke films. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; if olive skin, keep it olive; maintain all ethnic skin characteristics. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE AND TEXTURE - curly stays curly, straight stays straight, long stays long, short stays short. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender. Focus on authentic Studio Ghibli character art style while preserving all background elements.';

        case 'South Park':
          return 'Convert this person into South Park cartoon style: perfectly round geometric head, tiny black dot eyes, simple line mouth, thick black outlines, construction paper cutout appearance, extremely simple geometric shapes exactly like the TV show. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE simplified to South Park style - curly becomes South Park curly, straight becomes South Park straight. MAINTAIN ORIGINAL SKIN TONE but simplified to South Park style. PRESERVE from original image: clothing colors, same facial expression, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender. Focus on authentic South Park character art style while preserving all background elements.';

        case 'Family Guy':
          return 'Convert this person into Family Guy cartoon style: oval elongated head, large white oval eyes with black pupils, thick black outlines around character, slightly exaggerated facial features, Seth MacFarlane animation style, flat 2D cartoon appearance exactly like the TV show. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE AND TEXTURE - curly stays curly, straight stays straight, long stays long, short stays short. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; maintain all ethnic skin characteristics. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender. Focus on perfect Family Guy character art style while preserving all background elements.';

        case 'Dragon Ball':
          return 'Convert this person into Dragon Ball Z anime style: CRITICAL: First determine if the person appears to be male or female. FOR MALES: Saiyan warrior style with muscular physique, spiky detailed hair, strong angular jawline like Goku or Vegeta. FOR FEMALES: elegant anime style with graceful physique, flowing smooth hair (NOT spiky), softer facial features like Bulma, Chi-Chi, or Android 18. Both styles should have large expressive anime eyes, dynamic shading with cell-shaded coloring, vibrant colors, highly detailed anime artwork exactly like Akira Toriyama\'s art style. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE HAIR STYLE adapted to appropriate style: males get spiky Saiyan hair, females get flowing anime hair. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; maintain all ethnic skin characteristics. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender. Focus on authentic Dragon Ball Z anime art style while preserving all background elements.';

        case 'Anime':
          return 'Convert this person into modern anime style: large expressive anime eyes with detailed iris, smooth anime hair with highlights and shadows, soft anime facial features, vibrant anime colors, clean anime art style with cel-shading effects and smooth gradients. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR AND STYLE - maintain all hair characteristics including color, length, texture, and style but give them anime styling with proper highlights, depth, and smooth shading. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT NATURAL SKIN TONE - maintain all skin color and ethnic characteristics while applying clean anime art style. PRESERVE from original image: facial expression, clothing colors, ethnicity characteristics. Maintain same age and gender. Focus on authentic modern anime art style while preserving all background elements completely unchanged.';

        default:
          return `Convert this person into ${style.toLowerCase()} cartoon animation style while keeping the original background completely unchanged. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR AND STYLE - maintain all hair characteristics including color, length, texture, and style. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT NATURAL SKIN TONE - maintain all skin color and ethnic characteristics. PRESERVE from original image: facial expression, clothing colors, ethnicity characteristics. Maintain same age and gender. Focus on authentic cartoon style transformation while preserving all background elements.`;
      }
    };

    const prompt = getStyleSpecificPrompt(style);

    // Use FLUX Kontext Pro - official model with 4M runs for state-of-the-art image editing
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
          output_quality: 90
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
        { error: 'Image conversion failed' },
        { status: 500 }
      );
    }

    // Handle different output formats from different models
    let generatedImageUrl;
    if (Array.isArray(result.output)) {
      generatedImageUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      generatedImageUrl = result.output;
    } else {
      generatedImageUrl = result.output;
    }

    console.log('Full result:', result);
    console.log('Generated URL:', generatedImageUrl);

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      style,
      clothing
    });

  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Internal server error during conversion' },
      { status: 500 }
    );
  }
} 