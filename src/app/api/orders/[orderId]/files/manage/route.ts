import { NextRequest, NextResponse } from 'next/server';

// This endpoint manages digitizer files independently of order notes
// Files are organized as: digitizer-uploads/{orderId}/{timestamp}-{filename}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID is required' 
      }, { status: 400 });
    }

    console.log('📁 Fetching files directly from Vercel Blob for order:', orderId);

    // List all files in the order's directory
    const { list } = await import('@vercel/blob');
    
    try {
      const { blobs } = await list({
        prefix: `digitizer-uploads/${orderId}/`,
      });

      const files = blobs.map(blob => ({
        name: blob.pathname.split('/').pop()?.replace(/^\d+-/, '') || blob.pathname,
        originalName: blob.pathname.split('/').pop()?.replace(/^\d+-/, '') || blob.pathname,
        url: blob.url,
        size: blob.size,
        type: 'application/octet-stream',
        uploadedAt: blob.uploadedAt,
        blobId: blob.pathname // Store the full path for deletion
      }));

      console.log(`📁 Found ${files.length} files in Vercel Blob for order ${orderId}`);

      return NextResponse.json({
        success: true,
        files: files,
        orderId: orderId
      });

    } catch (blobError) {
      console.error('Error listing files from Vercel Blob:', blobError);
      return NextResponse.json({
        success: true,
        files: [], // Return empty array if no files found
        orderId: orderId
      });
    }

  } catch (error) {
    console.error('❌ Error fetching files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;
    const body = await request.json();
    const { fileName, blobPath } = body;

    if (!orderId || !fileName || !blobPath) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID, file name, and blob path are required' 
      }, { status: 400 });
    }

    console.log('🗑️ Deleting file:', fileName, 'from path:', blobPath);

    // Delete the file from Vercel Blob
    const { del } = await import('@vercel/blob');
    
    try {
      await del(blobPath);
      console.log('✅ Successfully deleted file:', fileName);
      
      return NextResponse.json({
        success: true,
        message: `File "${fileName}" deleted successfully`
      });

    } catch (deleteError) {
      console.error('❌ Failed to delete file from Vercel Blob:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete file from storage' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}