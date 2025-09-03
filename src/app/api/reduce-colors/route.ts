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

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'Image data is required' },
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

    console.log('Processing color reduction for embroidery conversion...');

    // Upload image to Replicate file service if it's a data URL
    let imageUrl = imageData;
    if (imageData.startsWith('data:image/')) {
      const imageUpload = await uploadToReplicate(imageData, 'image.jpg');
      imageUrl = imageUpload.urls.get;
      console.log('Image uploaded to:', imageUrl);
    }

    // Embroidery-style conversion prompt for nano banana
    const prompt = `Convert this image to embroidery patch style: reduce colors to 8-12 flat, solid colors like embroidery thread. Remove gradients and shading, make areas solid colors. Keep all original colors but make them flat and vibrant. Preserve transparency. No outlines or borders.`;

    console.log('Using google/nano-banana model for color reduction');

    // Use nano banana model for consistency
    const response = await fetch('https://api.replicate.com/v1/models/google/nano-banana/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          image_input: [imageUrl],
          output_format: "png"
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

    const result = await response.json();
    console.log('Nano banana color reduction result:', result);

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
        console.log(`Color reduction status check ${attempts + 1}:`, finalResult.status);
      }
      
      attempts++;
    }

    if (finalResult.status === 'succeeded' && finalResult.output) {
      console.log('Generated embroidery image URL:', finalResult.output);
      
      return NextResponse.json({
        success: true,
        imageUrl: finalResult.output
      });
    } else {
      console.error('Nano banana color reduction failed:', finalResult.error || 'Unknown error');
      return NextResponse.json(
        { error: finalResult.error || 'Color reduction failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Color reduction error:', error);
    return NextResponse.json(
      { error: 'Internal server error during color reduction' },
      { status: 500 }
    );
  }
}

async function uploadToReplicate(dataUrl: string, filename: string) {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  // Create form data
  const formData = new FormData();
  formData.append('content', blob, filename);
  
  // Upload to Replicate
  const uploadResponse = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }
  
  const uploadResult = await uploadResponse.json();
  console.log(`Upload successful for ${filename}:`, uploadResult);
  
  return uploadResult;
}