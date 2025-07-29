import { NextRequest, NextResponse } from 'next/server';
import { saveImageToBlobStorage } from '@/lib/imageStorage';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, style, clothing } = await request.json();
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Image URL is required'
      }, { status: 400 });
    }

    console.log('💾 Saving design to permanent storage:', { imageUrl: imageUrl.substring(0, 50) + '...', style, clothing });
    
    // Generate date-based filename for the design
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now();
    
    const styleSlug = style ? style.toLowerCase().replace(/\s+/g, '-') : 'custom';
    const clothingSlug = clothing ? clothing.toLowerCase().replace(/\s+/g, '-') : 'item';
    const filename = `designs/${year}/${month}/${day}/${clothingSlug}-${styleSlug}-${timestamp}.png`;

    const saveResult = await saveImageToBlobStorage(imageUrl, filename);

    if (saveResult.success && saveResult.permanentUrl) {
      console.log('✅ Design saved to permanent storage:', saveResult.permanentUrl);
      return NextResponse.json({
        success: true,
        permanentUrl: saveResult.permanentUrl,
        originalUrl: imageUrl
      });
    } else {
      console.error('❌ Failed to save design:', saveResult.error);
      return NextResponse.json({
        success: false,
        error: saveResult.error || 'Failed to save design'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error in save-design API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 