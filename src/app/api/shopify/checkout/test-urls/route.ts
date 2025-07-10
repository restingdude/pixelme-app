import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to help debug checkout URLs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cartId = searchParams.get('cartId');

  if (!cartId) {
    return NextResponse.json({ error: 'cartId parameter required' }, { status: 400 });
  }

  try {
    // Sample cart URL from your logs
    const sampleCheckoutUrl = "https://pixelmecustoms.com/cart/c/Z2NwLWFzaWEtc291dGhlYXN0MTowMUpaTVdWOUVFM0RCUTROUUZHMjVRN0M5TQ?key=0076494c486db5afde6dadf01b7a58b9";
    
    // Extract parts
    const url = new URL(sampleCheckoutUrl);
    const domain = url.origin;
    const fullPath = sampleCheckoutUrl.split('/cart/c/')[1]; // "TOKEN?key=KEY"
    const cartToken = fullPath?.split('?')[0]; // Just "TOKEN"
    const keyParam = fullPath?.split('key=')[1]; // Just "KEY"

    // All possible checkout URL formats to test
    const checkoutUrls = {
      "1_original_from_shopify": sampleCheckoutUrl,
      "2_universal_checkout": `${domain}/checkout`,
      "3_cart_page": `${domain}/cart`,
      "4_simple_cart_token": `${domain}/cart/${cartToken}`,
      "5_cart_with_key": `${domain}/cart/${cartToken}?key=${keyParam}`,
      "6_checkouts_endpoint": `${domain}/checkouts/c/${cartToken}`,
      "7_checkouts_with_key": `${domain}/checkouts/c/${cartToken}?key=${keyParam}`,
      "8_web_checkout": `${domain}/checkout?cart=${cartToken}`,
      "9_checkout_token": `${domain}/checkout/${cartToken}`,
    };

    return NextResponse.json({
      success: true,
      message: "Test these URLs manually in your browser to see which ones work",
      instructions: [
        "1. Copy each URL below",
        "2. Paste it into a new browser tab",
        "3. See which ones successfully show a checkout page",
        "4. Let me know which URL format works!"
      ],
      cartDetails: {
        cartId,
        domain,
        cartToken,
        keyParam
      },
      urlsToTest: checkoutUrls
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate test URLs',
      details: error
    }, { status: 500 });
  }
} 