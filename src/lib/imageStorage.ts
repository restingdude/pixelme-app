import { put } from '@vercel/blob';

export interface SavedImageResult {
  success: boolean;
  permanentUrl?: string;
  error?: string;
}

/**
 * Downloads an image from Replicate URL and saves it to Vercel Blob Storage
 * @param replicateUrl - The temporary Replicate image URL
 * @param filename - Custom filename for the saved image
 * @returns Permanent Blob Storage URL or error
 */
export async function saveImageToBlobStorage(
  replicateUrl: string, 
  filename: string
): Promise<SavedImageResult> {
  try {
    console.log('🎨 Saving image to blob storage:', { replicateUrl, filename });

    // Download the image from Replicate
    const response = await fetch(replicateUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    console.log('📦 Image downloaded:', { 
      size: imageBuffer.byteLength, 
      contentType,
      sizeKB: Math.round(imageBuffer.byteLength / 1024)
    });

    // Save to Vercel Blob Storage
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType: contentType,
    });

    console.log('✅ Image saved to blob storage:', { 
      url: blob.url, 
      filename: filename 
    });

    return {
      success: true,
      permanentUrl: blob.url
    };

  } catch (error) {
    console.error('❌ Failed to save image to blob storage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generates a unique filename for a custom design image
 */
export function generateImageFilename(orderId: string, lineItemId: string, style?: string): string {
  const timestamp = Date.now();
  const styleSlug = style ? `-${style.toLowerCase().replace(/\s+/g, '-')}` : '';
  return `orders/${orderId}/designs/item-${lineItemId}${styleSlug}-${timestamp}.png`;
}

/**
 * Saves all custom design images from an order
 */
export async function saveOrderImages(order: any): Promise<{ 
  savedImages: Array<{ lineItemId: string; permanentUrl: string }>;
  failures: Array<{ lineItemId: string; error: string }>;
}> {
  const savedImages: Array<{ lineItemId: string; permanentUrl: string }> = [];
  const failures: Array<{ lineItemId: string; error: string }> = [];

  // Find all line items with custom designs
  const customLineItems = order.line_items?.filter((item: any) => 
    item.properties?.some((prop: any) => prop.name === 'custom_design_url')
  ) || [];

  console.log(`🎨 Found ${customLineItems.length} custom design items to save`);

  for (const item of customLineItems) {
    try {
      // Extract custom design URL and style
      const customProps = item.properties?.reduce((acc: any, prop: any) => {
        acc[prop.name] = prop.value;
        return acc;
      }, {});

      const customDesignUrl = customProps.custom_design_url;
      const style = customProps.style;

      if (!customDesignUrl) {
        console.warn('⚠️ No custom_design_url found for item:', item.id);
        continue;
      }

      // Generate filename
      const filename = generateImageFilename(order.id.toString(), item.id.toString(), style);

      // Save image
      const result = await saveImageToBlobStorage(customDesignUrl, filename);

      if (result.success && result.permanentUrl) {
        savedImages.push({
          lineItemId: item.id.toString(),
          permanentUrl: result.permanentUrl
        });
        console.log(`✅ Saved image for item ${item.id}: ${result.permanentUrl}`);
      } else {
        failures.push({
          lineItemId: item.id.toString(),
          error: result.error || 'Unknown error'
        });
        console.error(`❌ Failed to save image for item ${item.id}:`, result.error);
      }

    } catch (error) {
      failures.push({
        lineItemId: item.id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`❌ Error processing item ${item.id}:`, error);
    }
  }

  return { savedImages, failures };
} 