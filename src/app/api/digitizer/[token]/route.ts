import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token is required' 
      }, { status: 400 });
    }

    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('Missing Shopify environment variables');
    }

    // Decode the token to get order information
    try {
      const decodedData = Buffer.from(token, 'base64').toString('ascii');
      const [orderIdStr] = decodedData.split('-');
      const orderId = parseInt(orderIdStr);

      if (!orderId || isNaN(orderId)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid token format' 
        }, { status: 400 });
      }

      console.log('📋 Fetching order details for digitizer token:', token);
      console.log('📋 Extracted order ID:', orderId);

      // Fetch the specific order from Shopify
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

      // Check for custom PixelMe items
      const customItems = order.line_items?.filter((item: any) => 
        item.properties?.some((prop: any) => prop.name === 'custom_design_url')
      ) || [];

      if (customItems.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'This order does not contain custom designs' 
        }, { status: 400 });
      }

      // Process the custom items
      const pixelMeItems = customItems.map((item: any) => {
        const props = item.properties?.reduce((acc: any, prop: any) => {
          acc[prop.name] = prop.value;
          return acc;
        }, {});

        return {
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          customDesignUrl: props.custom_design_url,
          style: props.style,
          position: props.position,
          clothingType: props.clothing_type,
          designSize: props['Design Size'] || props['Image Size'] || props['Embroidery Sizes'] || 'Not specified'
        };
      });

      // Check job status based on tags
      const tags = order.tags || '';
      console.log('🏷️ Order tags:', tags);
      const jobAccepted = tags.includes('digitizer:') || tags.includes('digitizer-approved') || tags.includes('digitizer-pending-approval') || tags.includes('digitizer-completed') || tags.includes('digitizer-completed-unpaid') || tags.includes('digitizer-completed-paid');
      const jobApproved = tags.includes('digitizer:') || tags.includes('digitizer-approved');
      const jobCompleted = tags.includes('digitizer-completed') || tags.includes('digitizer-completed-unpaid') || tags.includes('digitizer-completed-paid');
      const modificationsRequested = tags.includes('digitizer-modifications');
      const pendingApproval = tags.includes('digitizer-pending-approval');
      console.log('🔍 Status checks - modificationsRequested:', modificationsRequested, 'jobAccepted:', jobAccepted, 'jobApproved:', jobApproved);
      let digitizerName = null;
      let modificationMessage = null;
      
      // Extract digitizer name from tags
      const digitizerMatch = tags.match(/digitizer:([^,]+)/);
      if (digitizerMatch) {
        digitizerName = digitizerMatch[1].trim();
      }

      // Extract modification message from order note if modifications were requested
      if (modificationsRequested && order.note) {
        console.log('🔍 Modifications requested - checking note:', order.note);
        const modificationMatch = order.note.match(/Modifications requested by admin: ([^\n]+)/);
        if (modificationMatch) {
          modificationMessage = modificationMatch[1].trim();
          console.log('✅ Found modification message:', modificationMessage);
        } else {
          console.log('❌ Could not extract modification message from note');
        }
      } else {
        console.log('🔍 No modifications requested or no note. modificationsRequested:', modificationsRequested, 'note exists:', !!order.note);
      }

      // Return the order details formatted for the digitizer
      const orderDetails = {
        id: order.id,
        orderNumber: order.order_number,
        name: order.name,
        customerName: order.customer ? 
          `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 
          order.billing_address?.name || 'Unknown Customer',
        customerEmail: order.customer?.email || order.email,
        createdAt: order.created_at,
        totalPrice: order.total_price,
        currency: order.currency,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        pixelMeItems,
        customItemsCount: customItems.length,
        totalItems: order.line_items?.length || 0,
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address,
        note: order.note,
        jobAccepted: jobAccepted,
        jobApproved: jobApproved,
        jobCompleted: jobCompleted,
        modificationsRequested: modificationsRequested,
        pendingApproval: pendingApproval,
        digitizerName: digitizerName,
        modificationMessage: modificationMessage
      };

      return NextResponse.json({
        success: true,
        order: orderDetails
      });

    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or corrupted token' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error fetching order for digitizer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token is required' 
      }, { status: 400 });
    }

    // Decode the token to get order information
    try {
      const decodedData = Buffer.from(token, 'base64').toString('ascii');
      const [orderIdStr] = decodedData.split('-');
      const orderId = parseInt(orderIdStr);

      if (!orderId || isNaN(orderId)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid token format' 
        }, { status: 400 });
      }

      console.log('📋 Digitizer accepting job for order ID:', orderId);

      // In a real implementation, you would:
      // 1. Update the order with digitizer acceptance status
      // 2. Store digitizer information
      // 3. Send notifications to customer/admin
      // 4. Update order metadata or tags

      // For now, we'll simulate the acceptance
      // You could update Shopify order tags or metafields here
      
      if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
        throw new Error('Missing Shopify environment variables');
      }

      // Update order with a tag to indicate digitizer acceptance and store digitizer name
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
              tags: `${body.digitizerName ? `digitizer:${body.digitizerName}` : ''}`,
              note: body.digitizerNote || `Job accepted by digitizer${body.digitizerName ? ` ${body.digitizerName}` : ''}`
            }
          })
        }
      );

      if (!updateResponse.ok) {
        console.error('Failed to update order:', updateResponse.status);
        // Don't fail the request if tag update fails
      }

      return NextResponse.json({
        success: true,
        message: 'Job accepted successfully',
        orderId: orderId
      });

    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or corrupted token' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error accepting digitizer job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const formData = await request.formData();
    
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token is required' 
      }, { status: 400 });
    }

    // Decode the token to get order information
    try {
      const decodedData = Buffer.from(token, 'base64').toString('ascii');
      const [orderIdStr] = decodedData.split('-');
      const orderId = parseInt(orderIdStr);

      if (!orderId || isNaN(orderId)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid token format' 
        }, { status: 400 });
      }

      console.log('📋 Processing file upload for order ID:', orderId);

      // Get uploaded files
      const files = formData.getAll('files') as File[];
      const note = formData.get('note') as string || '';

      if (files.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No files uploaded' 
        }, { status: 400 });
      }

      console.log(`📁 Received ${files.length} files for upload`);

      // Upload files to Vercel Blob storage
      const uploadedFiles = [];
      const uploadErrors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name}`);
          
          // Generate unique filename
          const timestamp = Date.now();
          const filename = `digitizer-uploads/${orderId}/${timestamp}-${file.name}`;
          
          // Upload to Vercel Blob
          const { put } = await import('@vercel/blob');
          const blob = await put(filename, file, {
            access: 'public',
            contentType: file.type,
          });

          uploadedFiles.push({
            name: file.name,
            originalName: file.name,
            size: file.size,
            type: file.type,
            url: blob.url,
            uploadedAt: new Date().toISOString()
          });

          console.log(`✅ Successfully uploaded: ${file.name} -> ${blob.url}`);
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          uploadErrors.push({
            name: file.name,
            error: error instanceof Error ? error.message : 'Unknown upload error'
          });
        }
      }

      if (uploadedFiles.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to upload any files',
          details: uploadErrors
        }, { status: 500 });
      }

      console.log(`📁 Successfully uploaded ${uploadedFiles.length} files, ${uploadErrors.length} errors`);

      // First, get the current order to preserve digitizer name
      let currentDigitizerName = 'Unknown';
      if (process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
        try {
          const getCurrentOrderResponse = await fetch(
            `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/orders/${orderId}.json`,
            {
              headers: {
                'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
                'Content-Type': 'application/json',
              },
            }
          );
          
          if (getCurrentOrderResponse.ok) {
            const currentOrderData = await getCurrentOrderResponse.json();
            const currentTags = currentOrderData.order?.tags || '';
            const digitizerMatch = currentTags.match(/digitizer:([^,]+)/);
            if (digitizerMatch) {
              currentDigitizerName = digitizerMatch[1].trim();
            }
          }
        } catch (error) {
          console.error('Failed to get current order:', error);
        }

        // Update order status to pending approval after file upload
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
                tags: `digitizer-pending-approval, digitizer:${currentDigitizerName}`,
                note: `${note}\n\nDigitization files uploaded: ${uploadedFiles.length} files - Pending admin approval\n\nFiles are stored in Vercel Blob and accessible via the admin panel.`
              }
            })
          }
        );

        if (!updateResponse.ok) {
          console.error('Failed to update order status:', updateResponse.status);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Files uploaded successfully',
        files: uploadedFiles,
        uploadErrors: uploadErrors,
        orderId: orderId
      });

    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError);
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or corrupted token' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error processing file upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}