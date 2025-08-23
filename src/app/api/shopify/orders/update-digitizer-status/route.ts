import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { orderId, status, digitizerName, note, customTags, customNote } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: 'Order ID and status are required' 
      }, { status: 400 });
    }

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    console.log(`📋 Updating digitizer status for order ${orderId} to ${status}`);
    console.log('📝 Custom tags:', customTags);
    console.log('📝 Custom note:', customNote);

    let tags: string;
    let orderNote: string;

    // Use custom tags and note if provided (for manual status changes)
    if (customTags !== undefined && customNote !== undefined) {
      tags = customTags;
      orderNote = customNote;
      console.log('✅ Using custom tags and note');
    } else {
      console.log('⚠️ Using default status logic');
      // Use original logic for approve/modifications actions
      switch (status) {
        case 'approved':
          tags = `digitizer-approved${digitizerName ? `, digitizer:${digitizerName}` : ''}`;
          orderNote = `Digitizer ${digitizerName} approved for this job`;
          break;
        case 'modifications':
          tags = `digitizer-modifications${digitizerName ? `, digitizer:${digitizerName}` : ''}`;
          orderNote = `Admin requested modifications from ${digitizerName}: ${note}`;
          break;
        case 'pending_approval':
          tags = `digitizer-pending-approval${digitizerName ? `, digitizer:${digitizerName}` : ''}`;
          orderNote = `Digitization files uploaded by ${digitizerName} - Pending admin approval`;
          break;
        default:
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid status' 
          }, { status: 400 });
      }
    }

    console.log('📤 Sending to Shopify:', {
      orderId,
      tags,
      note: orderNote
    });

    // Update the order in Shopify
    const updateResponse = await fetch(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/orders/${orderId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            id: orderId,
            tags: tags,
            note: orderNote
          }
        })
      }
    );

    if (!updateResponse.ok) {
      console.error('❌ Shopify API error:', updateResponse.status);
      const errorText = await updateResponse.text();
      console.error('❌ Error details:', errorText);
      throw new Error(`Shopify API error: ${updateResponse.status}`);
    }

    console.log(`✅ Successfully updated digitizer status for order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: `Digitizer status updated to ${status}`
    });

  } catch (error) {
    console.error('❌ Error updating digitizer status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}