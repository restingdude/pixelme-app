import { NextRequest, NextResponse } from 'next/server';
import { rateLimitStore, cleanupExpiredEntries } from '../../../lib/rateLimitStore';

export async function POST(request: NextRequest) {
  let shouldDecrementOnError = false;
  let clientIP = '';
  
  try {
    // Get client IP address
    clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    '127.0.0.1';

    // Clean up expired entries
    cleanupExpiredEntries();

    // Check rate limit (5 generations per hour)
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const maxGenerations = 5;

    const clientData = rateLimitStore.get(clientIP);
    
    if (clientData) {
      // Check if the hour has passed
      if (now > clientData.resetTime) {
        // Reset the counter - DON'T INCREMENT YET
        rateLimitStore.set(clientIP, { count: 0, resetTime: now + oneHour });
      } else {
        // Check if limit exceeded
        if (clientData.count >= maxGenerations) {
          const timeUntilReset = Math.ceil((clientData.resetTime - now) / (60 * 1000)); // minutes
          return NextResponse.json(
            { 
              error: `Rate limit exceeded. You can only generate ${maxGenerations} images per hour. Please try again in ${timeUntilReset} minutes.`,
              rateLimitExceeded: true,
              timeUntilReset: timeUntilReset
            },
            { status: 429 }
          );
        }
        // DON'T INCREMENT YET - will do after successful generation
      }
    } else {
      // First generation for this IP - initialize with 0
      rateLimitStore.set(clientIP, { count: 0, resetTime: now + oneHour });
    }

    const { imageData, style, clothing, peopleCount, genders } = await request.json();

    if (!imageData || !style || !clothing) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData, style, or clothing' },
        { status: 400 }
      );
    }

    // Check if imageData is valid (Safari sometimes sends corrupted data)
    if (!imageData.startsWith('data:image/')) {
      console.error('Invalid image data format received');
      // Don't consume credit for invalid data
      return NextResponse.json(
        { error: 'Invalid image format. Please try uploading the image again.' },
        { status: 400 }
      );
    }

    // Log data size for debugging Safari issues
    console.log(`📱 Received image data size: ${imageData.length} bytes`);
    
    // Warn if image is very large (might cause issues on mobile)
    if (imageData.length > 3 * 1024 * 1024) {
      console.warn('⚠️ Large image received, may cause issues on mobile devices');
    }
    
    // Log current rate limit status before processing
    const currentStatus = rateLimitStore.get(clientIP);
    console.log(`📊 Rate limit status for ${clientIP}: ${currentStatus ? `${currentStatus.count}/5 used` : 'new user'}`);

    const replicateApiKey = process.env.REPLICATE_API_TOKEN;

    if (!replicateApiKey) {
      return NextResponse.json(
        { error: 'Replicate API key not configured. Please add REPLICATE_API_TOKEN to your environment variables.' },
        { status: 500 }
      );
    }

    // Generate simplified subject description to avoid content filters
    const generateSubjectDescription = (peopleCount: number, genders: string[]) => {
      if (!peopleCount || peopleCount <= 1) {
        return '';
      }
      
      // Keep it simple and neutral - just mention multiple subjects exist
      return `Convert ${peopleCount} subjects in the image. `;
    };

    const subjectDescription = generateSubjectDescription(peopleCount, genders);

    const getStyleSpecificPrompt = (style: string) => {
      switch (style) {
        case 'Yellow Cartoon':
          return `${subjectDescription}Convert into The Simpsons cartoon style: large white circular eyes with small black pupils, round cartoon head, flat 2D animation style. NO OUTLINES OR BORDERS - create clean edges without black outlines. Preserve original facial features and proportions. Maintain original hair color and style. SIMPSONS SKIN COLOR: For lighter skin tones, use bright yellow like Homer and Marge. For darker skin tones, use brown like Dr. Hibbert. Keep original background unchanged. Use 4-finger hands and simple clothing without outlines.`;

        case 'Anime Fantasy':
          return `${subjectDescription}Convert into Studio Ghibli animation style like Spirited Away or Princess Mononoke: soft rounded facial features, large expressive eyes, gentle expression, hand-drawn watercolor style with soft organic lines, dreamy lighting, detailed flowing hair, muted natural colors, soft gradient shading. NO OUTLINES OR BORDERS - create clean edges without black outlines. Preserve original facial features and proportions. Maintain original hair color and style. Keep original background unchanged.`;

        case 'Paper Animation':
          return `${subjectDescription}Convert into South Park cartoon style: perfectly round geometric head, tiny black dot eyes, simple line mouth, construction paper cutout appearance, extremely simple geometric shapes. NO OUTLINES OR BORDERS - create clean edges without black outlines. Preserve original facial features and proportions. Maintain original hair color and style simplified to South Park style. Keep original background unchanged.`;

        case 'Animated Comedy':
          return `${subjectDescription}Convert into Family Guy cartoon style: oval elongated head, large white oval eyes with black pupils, slightly exaggerated facial features, flat 2D cartoon appearance. NO OUTLINES OR BORDERS - create clean edges without black outlines. Preserve original facial features and proportions. Maintain original hair color and style. Keep original background unchanged.`;

        case 'Action Anime':
          return `${subjectDescription}Convert into Dragon Ball Z anime style: vibrant colors, cell-shaded art style, angular anime eyes, dynamic spiky hair. For pets: keep natural fur texture. Use DBZ character proportions and styling. Keep original background unchanged. Preserve original hair/fur color.`;



        default:
          return `${subjectDescription}Convert into ${style.toLowerCase()} cartoon animation style. NO OUTLINES OR BORDERS - create clean edges without black outlines. Preserve original facial features and proportions. Maintain original hair color and style. Keep original background unchanged.`;
      }
    };

    const prompt = getStyleSpecificPrompt(style);
    
    // Negative prompt to aggressively prevent any outlines
    const negativePrompt = `OUTLINES, BORDERS, LINES, BLACK OUTLINES, THICK OUTLINES, THIN OUTLINES, FINE OUTLINES, CARTOON OUTLINES, COMIC BOOK OUTLINES, ANIMATION OUTLINES, CHARACTER OUTLINES, EDGE LINES, CONTOUR LINES, STROKE OUTLINES, BOUNDARY LINES, PERIMETER LINES, SILHOUETTE LINES, DRAWN LINES, SKETCHED LINES, TRACED LINES, OUTLINED EDGES, BORDERED SHAPES, LINE ART, VECTOR LINES, MARKER LINES, PEN LINES, PENCIL LINES`;

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
          negative_prompt: negativePrompt,
          output_format: "png",
          output_quality: 90
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Replicate API error:', errorData);
      // Don't consume credit for API errors
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
        // Don't consume credit for polling errors
        console.error('Failed to poll prediction status');
        throw new Error('Failed to poll prediction status');
      }
      
      result = await pollResponse.json();
    }

    if (result.status === 'failed') {
      console.error('Replicate prediction failed:', result.error);
      // Don't consume credit for failed generation
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
      // Don't consume credit if no image was generated
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    // SUCCESS! Now consume the credit
    const currentTime = Date.now();
    const oneHourMs = 60 * 60 * 1000;
    const currentClientData = rateLimitStore.get(clientIP);
    
    if (currentClientData) {
      // Check if we need to reset (hour passed)
      if (currentTime > currentClientData.resetTime) {
        rateLimitStore.set(clientIP, { count: 1, resetTime: currentTime + oneHourMs });
      } else {
        // Increment the counter only on success
        rateLimitStore.set(clientIP, { count: currentClientData.count + 1, resetTime: currentClientData.resetTime });
      }
      console.log(`✅ Generation successful for ${clientIP}, credits used: ${currentClientData.count + 1}`);
    } else {
      // Shouldn't happen, but handle it
      rateLimitStore.set(clientIP, { count: 1, resetTime: currentTime + oneHourMs });
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
    // Don't consume credit for errors
    return NextResponse.json(
      { error: 'Internal server error during conversion' },
      { status: 500 }
    );
  }
} 