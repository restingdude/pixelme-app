import { NextRequest, NextResponse } from 'next/server';

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

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    console.log('📋 Fetching uploaded files for order:', orderId);

    // Fetch the order from Shopify to get the note with file URLs
    const response = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: 'Order not found' 
        }, { status: 404 });
      }
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const order = data.order;

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order not found' 
      }, { status: 404 });
    }

    // Parse uploaded files from order note
    const note = order.note || '';
    const uploadedFiles: Array<{
      name: string;
      url: string;
      size?: string;
      type?: string;
      uploadedAt?: string;
    }> = [];

    // Look for "Uploaded Files:" section in the note
    const uploadedFilesMatch = note.match(/Uploaded Files:\n([\s\S]*?)(?:\n\n|$)/);
    if (uploadedFilesMatch) {
      const filesSection = uploadedFilesMatch[1];
      const fileLines = filesSection.split('\n').filter((line: string) => line.trim().startsWith('- '));
      
      for (const fileLine of fileLines) {
        // Parse format: "- filename.ext (https://...)"
        const fileMatch = fileLine.match(/- (.+) \((https:\/\/.+)\)$/);
        if (fileMatch) {
          const [, fileName, fileUrl] = fileMatch;
          
          // Try to extract additional info from the URL or filename
          let fileType = 'application/octet-stream';
          let fileSize = 'Unknown';
          
          // Guess file type from extension
          const ext = fileName.toLowerCase().split('.').pop();
          if (ext) {
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
              fileType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
            } else if (['pdf'].includes(ext)) {
              fileType = 'application/pdf';
            } else if (['zip', 'rar'].includes(ext)) {
              fileType = 'application/zip';
            } else if (['txt'].includes(ext)) {
              fileType = 'text/plain';
            } else if (['doc', 'docx'].includes(ext)) {
              fileType = 'application/msword';
            }
          }
          
          uploadedFiles.push({
            name: fileName,
            url: fileUrl,
            type: fileType,
            size: fileSize
          });
        }
      }
    }

    console.log(`📁 Found ${uploadedFiles.length} uploaded files for order ${orderId}`);

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      orderId: orderId,
      orderNumber: order.order_number
    });

  } catch (error) {
    console.error('❌ Error fetching uploaded files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}