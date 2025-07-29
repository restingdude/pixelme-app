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
          return 'Convert this person into The Simpsons cartoon style exactly like characters from the TV show: large white circular eyes with small black pupils, thick black outlines around entire character, round cartoon head, flat 2D animation style exactly like the TV show. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure, jawline, eyebrows, and overall features. FOR MALES: maintain masculine jawline, broader facial structure, thicker eyebrows, and male-typical facial proportions like Homer Simpson or Ned Flanders. FOR FEMALES: maintain feminine facial features, softer jawline, thinner eyebrows, and female-typical facial proportions like Marge Simpson or Lisa Simpson. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE AND TEXTURE - curly stays curly, straight stays straight, long stays long, short stays short. SIMPSONS SKIN COLOR RULES: CAREFULLY EXAMINE THE ORIGINAL SKIN TONE - if the person has lighter/white/pale skin (like typical Caucasian skin tones), convert to BRIGHT VIBRANT YELLOW SKIN COLOR (hex #FFDB4D) like Homer, Marge, Bart, Lisa. However, if the person has darker/brown/black skin (like African American, Hispanic, or other darker ethnicities), keep it as BROWN SKIN COLOR like Dr. Hibbert, Carl Carlson, or Lou the police officer - do NOT make them yellow. This preserves ethnic diversity exactly as The Simpsons TV show does. PRESERVE from original image: same facial expression (smiling, serious, etc.), same clothing colors and style, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Keep 4-finger hands, simple solid colored clothing with black outlines. Maintain same age and gender.';

        case 'Studio Ghibli':
          return 'Convert this person into Studio Ghibli animation style exactly like characters from Spirited Away, Princess Mononoke, Howls Moving Castle, or My Neighbor Totoro: soft rounded facial features with large expressive eyes that are naturalistic (not overly exaggerated), gentle innocent expression, hand-drawn watercolor animation style with soft organic lines, dreamy atmospheric lighting, detailed naturalistic hair that flows beautifully, muted natural color palette, wholesome innocent appearance, soft gradient shading, delicate hand-painted textures exactly like Hayao Miyazaki films. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure, jawline, eyebrows, and overall features. FOR MALES: maintain masculine facial structure but with Ghibli softness - slightly broader face, gentle jawline, natural eyebrows, exactly like Howl, Haku, or Ashitaka. FOR FEMALES: maintain feminine facial features with soft rounded face, gentle jawline, delicate features, exactly like Chihiro, San, or Sophie. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. GHIBLI HAIR STYLE: Transform hair into beautiful flowing Ghibli style - detailed, naturalistic, with soft highlights and natural movement, maintaining original length and basic style but with Ghibli artistry. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; if olive skin, keep it olive; maintain all ethnic skin characteristics with soft Ghibli rendering. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender.';

        case 'South Park':
          return 'Convert this person into South Park cartoon style: perfectly round geometric head, tiny black dot eyes, simple line mouth, thick black outlines, construction paper cutout appearance, extremely simple geometric shapes exactly like the TV show. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure and overall features. FOR MALES: use slightly more angular or broader head shape typical of male South Park characters exactly like Stan Marsh, Kyle Broflovski, or Randy Marsh, maintain masculine proportions. FOR FEMALES: use rounder head shape typical of female South Park characters exactly like Wendy Testaburger, Sharon Marsh, or Liane Cartman, maintain feminine proportions. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE simplified to South Park style - curly becomes South Park curly, straight becomes South Park straight. MAINTAIN ORIGINAL SKIN TONE but simplified to South Park style. PRESERVE from original image: clothing colors, same facial expression, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender.';

        case 'Family Guy':
          return 'Convert this person into Family Guy cartoon style: oval elongated head, large white oval eyes with black pupils, thick black outlines around character, slightly exaggerated facial features, Seth MacFarlane animation style, flat 2D cartoon appearance exactly like the TV show. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure, jawline, eyebrows, and overall features. FOR MALES: maintain masculine jawline, broader facial structure, thicker neck, and male-typical Family Guy proportions exactly like Peter Griffin, Glenn Quagmire, or Joe Swanson. FOR FEMALES: maintain feminine facial features, softer jawline, more delicate facial structure, and female-typical Family Guy proportions exactly like Lois Griffin, Meg Griffin, or Bonnie Swanson. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT HAIR STYLE AND TEXTURE - curly stays curly, straight stays straight, long stays long, short stays short. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; maintain all ethnic skin characteristics. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender.';

        case 'Dragon Ball':
          return 'Convert this person into Dragon Ball Z anime style exactly like characters from the TV show: powerful muscular build with defined physique, large angular anime eyes with sharp detailed iris, strong confident facial expression, vibrant saturated colors, dynamic cell-shaded anime artwork with sharp contrasts and bold outlines exactly like Akira Toriyama art style. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure, jawline, eyebrows, body proportions, and overall features. FOR MALES: powerful warrior style with broad muscular shoulders, strong angular jawline, thick masculine eyebrows, confident expression, extremely spiky gravity-defying hair that points upward and outward exactly like Goku, Vegeta, or Gohan - hair should be dramatically spiky and voluminous. FOR FEMALES: strong fighter style but with feminine grace, athletic build, softer facial features but still strong, flowing dynamic hair with some spikes but more elegant exactly like Bulma, Android 18, or Videl - hair flows beautifully but with anime energy. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. DRAGON BALL HAIR TRANSFORMATION: Transform hair into iconic DBZ style - males get extremely spiky upward-pointing hair, females get flowing dynamic hair with elegant spikes, all hair should have anime highlights and sharp definition. PRESERVE EXACT NATURAL SKIN TONE - if pale skin, keep it pale; if medium skin, keep it medium; if dark skin, keep it dark; maintain all ethnic skin characteristics with vibrant DBZ anime rendering. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender.';


        case 'Rick and Morty':
          return 'Convert this person into Rick and Morty cartoon style exactly like the TV show: thin sketchy line art with organic hand-drawn quality, slightly exaggerated but realistic proportions, muted natural color palette, crude yet expressive character design exactly like Dan Harmon and Justin Roiland art style. Slightly oversized heads with realistic facial features, small pupils in larger eyes, natural skin tones, messy organic hair, loose sketchy outlines (NOT thick black borders), semi-realistic body proportions with slight cartoon exaggeration. CRITICAL GENDER PRESERVATION - ANALYZE VERY CAREFULLY: First examine facial structure, jawline, eyebrows, body proportions, and overall masculine/feminine characteristics in the original image. FOR MALES: maintain broader masculine jawline, thicker neck, more angular facial features, masculine eyebrow thickness, broader shoulders, male body proportions exactly like Rick Sanchez (older male), Jerry Smith (adult male), or Morty Smith (younger male) - preserve all masculine characteristics from original. FOR FEMALES: maintain softer feminine jawline, more delicate facial structure, feminine eyebrow shape, narrower shoulders, female body proportions exactly like Beth Smith (adult female), Summer Smith (younger female), or Jessica (teen female) - preserve all feminine characteristics from original. MOST IMPORTANT: The gender must be immediately recognizable and match the original person exactly. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR - if blonde hair, keep it blonde; if brown hair, keep it brown; if black hair, keep it black; if red/ginger hair, keep it red; if gray/white hair, keep it gray/white. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. RICK AND MORTY HAIR STYLE: Transform hair into the shows characteristic messy, organic hair style - maintain original color and basic style but give it that slightly unkempt, natural Rick and Morty look. PRESERVE EXACT NATURAL SKIN TONE - maintain all skin color and ethnic characteristics with the shows natural, muted color approach. PRESERVE from original image: same facial expression, same clothing colors and style, same ethnicity characteristics, and KEEP THE ORIGINAL BACKGROUND completely unchanged. Maintain same age and gender exactly as in original image.';

        default:
          return `Convert this person into ${style.toLowerCase()} cartoon animation style while keeping the original background completely unchanged. CRITICAL GENDER PRESERVATION: First carefully analyze if this person appears to be male or female by examining facial structure, jawline, eyebrows, and overall features. FOR MALES: maintain masculine facial structure and proportions. FOR FEMALES: maintain feminine facial features and proportions. CRITICAL: CAREFULLY EXAMINE THE HAIR COLOR IN THE ORIGINAL IMAGE - even if the person is far away or small in the frame, look closely at their hair area to determine the true hair color. PRESERVE EXACT HAIR COLOR AND STYLE - maintain all hair characteristics including color, length, texture, and style. Do not guess or assume hair color - analyze the actual hair pixels in the image regardless of distance or lighting. PRESERVE EXACT NATURAL SKIN TONE - maintain all skin color and ethnic characteristics. PRESERVE from original image: facial expression, clothing colors, ethnicity characteristics. Maintain same age and gender.`;
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

    // 🔄 TEMPORARY URL - Only save to permanent storage when order is paid
    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl, // Keep as temporary Replicate URL
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