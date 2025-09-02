import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData, prompt } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { success: false, error: 'Image data is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Starting nano banana image editing...');

    // Upload image to Replicate file service
    const imageUpload = await uploadToReplicate(imageData, 'image.jpg');

    console.log('Image uploaded to:', imageUpload.urls.get);
    console.log('Using google/nano-banana model');

    // Call nano banana model
    const response = await fetch('https://api.replicate.com/v1/models/google/nano-banana/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt,
          image_input: [imageUpload.urls.get],
          output_format: "png"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', errorText);
      return NextResponse.json(
        { success: false, error: `API request failed: ${response.status}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log('Nano banana result:', result);

    // Wait for completion with timeout
    let finalResult = result;
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (finalResult.status !== 'succeeded' && finalResult.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(finalResult.urls.get, {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        }
      });
      
      if (statusResponse.ok) {
        finalResult = await statusResponse.json();
        console.log(`Nano banana status check ${attempts + 1}:`, finalResult.status);
      }
      
      attempts++;
    }

    if (finalResult.status === 'succeeded' && finalResult.output) {
      console.log('Generated image URL:', finalResult.output);
      
      return NextResponse.json({
        success: true,
        imageUrl: finalResult.output
      });
    } else {
      console.error('Nano banana failed:', finalResult.error || 'Unknown error');
      return NextResponse.json(
        { success: false, error: finalResult.error || 'Nano banana failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Nano banana error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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