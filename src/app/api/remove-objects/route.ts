import { NextRequest, NextResponse } from 'next/server';



async function uploadImageToReplicate(base64Data: string, replicateApiKey: string, filename: string): Promise<string> {
  // Convert base64 to buffer, ensuring proper format
  const base64WithoutPrefix = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(base64WithoutPrefix, 'base64');
  
  // Determine MIME type based on data format
  const mimeType = base64Data.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
  
  // Create blob from buffer with correct MIME type
  const blob = new Blob([buffer], { type: mimeType });

  // Upload to Replicate
  const formData = new FormData();
  formData.append('content', blob, filename);

  const uploadResponse = await fetch('https://api.replicate.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateApiKey}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(`Upload failed for ${filename}:`, errorText);
    throw new Error(`Failed to upload ${filename} to Replicate: ${uploadResponse.status}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log(`Upload successful for ${filename}:`, uploadResult);
  return uploadResult.urls.get;
}

export async function POST(request: NextRequest) {
  try {
    const { imageData, maskData } = await request.json();

    if (!imageData || !maskData) {
      return NextResponse.json(
        { error: 'Missing required fields: imageData or maskData' },
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

    console.log('Uploading images to Replicate file service...');
    
    try {
      // Upload both image and mask to Replicate's file service
      const [imageUrl, maskUrl] = await Promise.all([
        uploadImageToReplicate(imageData, replicateApiKey, 'image.jpg'),
        uploadImageToReplicate(maskData, replicateApiKey, 'mask.jpg')
      ]);

      console.log('Image uploaded to:', imageUrl);
      console.log('Mask uploaded to:', maskUrl);
      console.log('Using zylim0702/remove-object model');
      
      // Use the exact format from the working curl command
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${replicateApiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait',
        },
        body: JSON.stringify({
          version: "0e3a841c913f597c1e4c321560aa69e2bc1f15c65f8c366caafc379240efd8ba",
          input: {
            image: imageUrl,
            mask: maskUrl
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Object removal API error:', errorData);
        return NextResponse.json(
          { error: 'Object removal failed: ' + (errorData.detail || errorData.title || 'Unknown error') },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('Object removal result:', result);

      // Handle the result - with Prefer: wait, we should get the final result immediately
      if (result.status === 'failed') {
        console.error('Object removal prediction failed:', result.error);
        return NextResponse.json(
          { error: 'Object removal failed: ' + result.error },
          { status: 500 }
        );
      }

      // Get the generated image URL
      let generatedImageUrl;
      if (Array.isArray(result.output)) {
        generatedImageUrl = result.output[0];
      } else if (typeof result.output === 'string') {
        generatedImageUrl = result.output;
      } else {
        generatedImageUrl = result.output;
      }

      console.log('Generated image URL:', generatedImageUrl);

      if (!generatedImageUrl) {
        return NextResponse.json(
          { error: 'No image generated' },
          { status: 500 }
        );
      }

      // Return the result directly from zylim0702/remove-object model
      return NextResponse.json({
        success: true,
        imageUrl: generatedImageUrl,
        method: 'zylim0702-remove-object'
      });

    } catch (error) {
      console.error('Object removal error:', error);
      return NextResponse.json(
        { error: 'Object removal failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Object removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error during object removal' },
      { status: 500 }
    );
  }
} 