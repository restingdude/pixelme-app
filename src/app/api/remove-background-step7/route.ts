import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
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

    console.log('Using cjwbw/rembg for step 7 transparent background removal');
    
    // Upload image to Replicate file service if it's a data URL
    let imageUrl = imageData;
    if (imageData.startsWith('data:image/')) {
      const imageUpload = await uploadToReplicate(imageData, 'step7-background-remove.png');
      imageUrl = imageUpload.urls.get;
      console.log('Image uploaded to Replicate for step 7:', imageUrl);
    }
    
    // Use cjwbw/rembg which is specifically designed for transparent background removal
    const response = await fetch('https://api.replicate.com/v1/models/cjwbw/rembg/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: imageUrl
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Step 7 background removal API error:', errorData);
      return NextResponse.json(
        { error: 'Step 7 background removal failed: ' + (errorData.detail || errorData.title || 'Unknown error') },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Step 7 background removal initial result:', result);

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
        console.log(`Step 7 background removal status check ${attempts + 1}:`, finalResult.status);
      }
      
      attempts++;
    }

    if (finalResult.status === 'failed') {
      console.error('Step 7 background removal prediction failed:', finalResult.error);
      return NextResponse.json(
        { error: 'Step 7 background removal failed: ' + finalResult.error },
        { status: 500 }
      );
    }

    if (finalResult.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Step 7 background removal timed out' },
        { status: 500 }
      );
    }

    // Get the generated image URL
    let generatedImageUrl;
    if (Array.isArray(finalResult.output)) {
      generatedImageUrl = finalResult.output[0];
    } else if (typeof finalResult.output === 'string') {
      generatedImageUrl = finalResult.output;
    } else {
      generatedImageUrl = finalResult.output;
    }

    console.log('Step 7 generated image URL:', generatedImageUrl);

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated in step 7' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      method: 'cjwbw-rembg-step7-transparent-background'
    });

  } catch (error) {
    console.error('Step 7 background removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error during step 7 background removal' },
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