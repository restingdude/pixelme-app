import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Create a checkout session from individual items OR from an existing cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a cart-to-checkout conversion
    if (body.cartId) {
      return await createCheckoutFromCart(body.cartId);
    }
    
    // Modern single-item checkout functionality using Cart API
    const { 
      variantId, 
      quantity = 1, 
      customImageUrl,
      clothing,
      style,
      size,
      color,
      position 
    } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    console.log('🛒 Buy Now - Creating cart for single item checkout');
    console.log('📋 Item details:', { variantId, quantity, clothing, style, size, color, position });

    // Step 1: Create a cart with the single item using Cart API
    const cartCreateMutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
                amount
                currencyCode
              }
              subtotalAmount {
                amount
                currencyCode
              }
            }
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  attributes {
                    key
                    value
                  }
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      price {
                        amount
                        currencyCode
                      }
                      product {
                        title
                        handle
                      }
                    }
                  }
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Prepare line item with all custom attributes
    const lineItems = [{
      merchandiseId: variantId.startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`,
      quantity,
      attributes: [
        ...(customImageUrl ? [{ key: 'custom_design_url', value: customImageUrl }] : []),
        ...(clothing ? [{ key: 'clothing_type', value: clothing }] : []),
        ...(style ? [{ key: 'style', value: style }] : []),
        ...(size ? [{ key: 'size', value: size }] : []),
        ...(color ? [{ key: 'color', value: color }] : []),
        ...(position ? [{ key: 'position', value: position }] : []),
        { key: 'created_via', value: 'PixelMe Buy Now' }
      ]
    }];

    const cartResponse = await shopifyStorefront.request(cartCreateMutation, {
      variables: { 
        input: { 
          lines: lineItems
        } 
      }
    });

    console.log('🔍 Cart creation response:', JSON.stringify(cartResponse, null, 2));

    // Check for cart creation errors
    if (!cartResponse.data || !cartResponse.data.cartCreate) {
      console.error('❌ Invalid cart creation response:', cartResponse);
      return NextResponse.json(
        { error: 'Failed to create cart', details: cartResponse },
        { status: 500 }
      );
    }

    if (cartResponse.data.cartCreate.userErrors.length > 0) {
      console.error('❌ Cart creation errors:', cartResponse.data.cartCreate.userErrors);
      return NextResponse.json(
        { error: 'Cart creation errors', details: cartResponse.data.cartCreate.userErrors },
        { status: 400 }
      );
    }

    const cart = cartResponse.data.cartCreate.cart;
    console.log('✅ Cart created successfully:', cart.id);
    console.log('🎨 Custom attributes:', cart.lines.edges[0]?.node.attributes);

    // Step 2: Use original checkout URL - let dynamic route handle redirect
    let shopifyCheckoutUrl = cart.checkoutUrl;
    console.log('✅ Buy Now - Using original checkout URL (will be handled by dynamic route):', shopifyCheckoutUrl);

    return NextResponse.json({
      success: true,
      checkout: {
        id: cart.id,
        webUrl: shopifyCheckoutUrl,
        totalPrice: cart.cost.totalAmount,
        subtotalPrice: cart.cost.subtotalAmount,
        totalQuantity: cart.totalQuantity,
        customItemsCount: cart.lines.edges.filter((edge: any) => 
          edge.node.attributes.some((attr: any) => attr.key === 'custom_design_url')
        ).length
      },
      message: 'Buy Now checkout created successfully'
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}

// New function to create checkout from existing cart
async function createCheckoutFromCart(cartId: string) {
  try {
    console.log('🛒 Creating checkout from cart:', cartId);
    
    // First, get the cart details
    const cartQuery = `
      query getCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                  }
                }
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    const cartResponse = await shopifyStorefront.request(cartQuery, {
      variables: { cartId }
    });

    if (!cartResponse.data.cart) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 404 }
      );
    }

    const cart = cartResponse.data.cart;
    console.log('📋 Cart lines:', cart.lines.edges.length);

    // Convert cart lines to checkout line items
    const lineItems = cart.lines.edges.map(({ node }: any) => ({
      variantId: node.merchandise.id,
      quantity: Math.max(1, node.quantity), // Ensure minimum quantity of 1
      customAttributes: node.attributes
    }));

    console.log('🎯 Checkout line items:', JSON.stringify(lineItems, null, 2));

    // Following Shopify AI guidance: Use Storefront API to create proper checkout session
    // Since checkoutCreate is deprecated, we'll use the Cart API's built-in checkout URL
    // But implement proper Storefront API patterns
    
    console.log('🚀 Creating proper Storefront API checkout session...');
    
    // Step 1: Get cart details with proper checkout information
    const cartDetailsQuery = `
      query getCartForCheckout($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode  
                    }
                    product {
                      id
                      title
                      handle
                    }
                  }
                }
                attributes {
                  key
                  value
                }
              }
            }
          }
        }
      }
    `;

    try {
      const cartResponse = await shopifyStorefront.request(cartDetailsQuery, {
        variables: { cartId }
      });

      console.log('✅ Cart details response:', JSON.stringify(cartResponse.data, null, 2));

      if (!cartResponse.data?.cart) {
        console.error('❌ Cart not found for checkout');
        return NextResponse.json(
          { error: 'Cart not found' },
          { status: 404 }
        );
      }

      const cart = cartResponse.data.cart;

      // Validate cart has items
      if (!cart.lines?.edges || cart.lines.edges.length === 0) {
        console.error('❌ Cart is empty');
        return NextResponse.json(
          { error: 'Cart is empty' },
          { status: 400 }
        );
      }

      // The proper way: Use Shopify's checkout URL directly
      // This should be the webUrl that Shopify AI mentioned
      let checkoutWebUrl = cart.checkoutUrl;
      
      console.log('📋 Shopify-provided checkout URL:', checkoutWebUrl);

      if (!checkoutWebUrl) {
        console.error('❌ No checkout URL from Shopify');
        return NextResponse.json(
          { error: 'No checkout URL available' },
          { status: 400 }
        );
      }

      // If the URL is in cart format, try to use Shopify's Web Checkout
      if (checkoutWebUrl.includes('/cart/c/')) {
        console.log('🔄 Converting cart URL to proper checkout format...');
        
                 // Use Shopify domain for cart/add URLs since these need to go directly to Shopify
         const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
         const domain = `https://${storeDomain}`;
        
                 // According to Shopify docs, we should redirect to their hosted checkout
         // Try the direct cart URL first, then fallback to cart page (since /checkout gives 404)
         const directCartUrl = checkoutWebUrl;
         const cartPageFallback = `${domain}/cart`;
        
                 console.log('🎯 Checkout options:');
         console.log('   1. Direct cart URL:', directCartUrl);
         console.log('   2. Cart page fallback:', cartPageFallback);
         
         // Since all checkout URLs give 404, use Shopify's cart/add endpoint
         // This will transfer our API cart items to Shopify's theme cart
         const cartItems = cart.lines.edges.map(({ node }: { node: any }) => {
           const variantId = node.merchandise.id.split('/').pop(); // Extract just the ID number
           const attributes = node.attributes.reduce((acc: Record<string, string>, attr: any) => {
             acc[`properties[${attr.key}]`] = attr.value;
             return acc;
           }, {} as Record<string, string>);
           
           return {
             id: variantId,
             quantity: node.quantity,
             ...attributes
           };
         });

         if (cartItems.length > 0) {
           const firstItem = cartItems[0];
           const params = new URLSearchParams({
             id: firstItem.id,
             quantity: firstItem.quantity.toString(),
             ...Object.fromEntries(Object.entries(firstItem).filter(([key]) => key.startsWith('properties[')))
           });
           
           const cartAddUrl = `${domain}/cart/add?${params.toString()}`;
           
           console.log('🔄 Using cart/add URL:', cartAddUrl);
           
           return NextResponse.json({
             success: true,
             checkout: {
               webUrl: cartAddUrl, // This will add item to theme cart and redirect to cart
               id: cart.id,
               totalAmount: cart.cost?.totalAmount,
               subtotalAmount: cart.cost?.subtotalAmount,
               totalQuantity: cart.totalQuantity,
               method: 'cart_add'
             },
             message: 'Using cart/add to transfer items to theme cart'
           });
         }
      }

      // Use original checkout URL - let dynamic route handle the redirect
      console.log('✅ Cart checkout - Using original checkout URL (will be handled by dynamic route):', checkoutWebUrl);

      return NextResponse.json({
        success: true,
        checkout: {
          webUrl: checkoutWebUrl,
          id: cart.id,
          totalAmount: cart.cost?.totalAmount,
          subtotalAmount: cart.cost?.subtotalAmount,
          totalQuantity: cart.totalQuantity
        },
        message: 'Shopify hosted checkout URL ready'
      });
      
    } catch (error) {
      console.error('❌ Storefront API checkout error:', error);
      
      // Fallback to custom domain cart page (will be handled by dynamic route if needed)
      const fallbackUrl = `https://pixelmecustoms.com/cart`;
      
      console.log('🔄 Using cart fallback (will be handled by dynamic route):', fallbackUrl);
      
      return NextResponse.json({
        success: true,
        checkout: { webUrl: fallbackUrl },
        message: 'Using universal checkout fallback'
      });
    }

  } catch (error) {
    console.error('Error creating checkout from cart:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout from cart' },
      { status: 500 }
    );
  }
} 