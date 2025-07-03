import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageData, maskData, prompt } = await request.json();

    if (!imageData || !maskData) {
      return NextResponse.json(
        { success: false, error: 'Image and mask data are required' },
        { status: 400 }
      );
    }

    console.log('Starting smart remove & fill with FLUX Fill Pro...');

    // Upload images to Replicate file service
    const [imageUpload, maskUpload] = await Promise.all([
      uploadToReplicate(imageData, 'image.jpg'),
      uploadToReplicate(maskData, 'mask.png')
    ]);

    console.log('Image uploaded to:', imageUpload.urls.get);
    console.log('Mask uploaded to:', maskUpload.urls.get);

    console.log('Using black-forest-labs/flux-fill-pro model');

    // Call FLUX Fill Pro model
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-fill-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          image: imageUpload.urls.get,
          mask: maskUpload.urls.get,
          prompt: prompt || 'Remove objects in masked areas and fill with extended background content',
          safety_checker: false,
          seed: Math.floor(Math.random() * 1000000),
          output_format: 'png',
          output_quality: 90,
          num_inference_steps: 30,
          guidance_scale: 3.5
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
    console.log('Smart remove & fill result:', result);

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
        console.log(`Fill status check ${attempts + 1}:`, finalResult.status);
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
      console.error('Smart remove & fill failed:', finalResult.error || 'Unknown error');
      return NextResponse.json(
        { success: false, error: finalResult.error || 'Smart remove & fill failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Smart remove & fill error:', error);
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