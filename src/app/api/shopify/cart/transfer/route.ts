import { NextRequest, NextResponse } from 'next/server';

// Transfer Storefront API cart to theme cart via Ajax API
export async function POST(request: NextRequest) {
  try {
    const { cartId } = await request.json();

    if (!cartId) {
      return NextResponse.json({ error: 'Cart ID required' }, { status: 400 });
    }

    // This creates a redirect URL that will add items to the theme cart
    // using Shopify's /cart/add endpoint
    
    // For now, we'll return instructions for manual cart transfer
    // This is because the Ajax API requires being on the same domain
    
    return NextResponse.json({
      success: true,
      message: 'Cart transfer instructions',
      instructions: {
        step1: 'The checkout URLs are broken due to Shopify store configuration',
        step2: 'You need to fix this in Shopify Admin → Settings → Checkout',
        step3: 'Alternatively, we can build a custom checkout form',
        step4: 'Or redirect users to add individual items to theme cart'
      },
      cartTransferUrl: `https://pixelmecustoms.com/cart/add?id=46530726428893&quantity=1&properties[style]=Simpsons&properties[custom_design_url]=https://replicate.delivery/czjl/6nUY3TDsla6pKlGTqabCDYeWqpzfKk64ex823zwrxZxPdz9pA/output.png`,
      note: 'This URL will add the specific item to Shopify theme cart'
    });

  } catch (error) {
    console.error('Cart transfer error:', error);
    return NextResponse.json({
      error: 'Failed to transfer cart',
      details: error
    }, { status: 500 });
  }
} 