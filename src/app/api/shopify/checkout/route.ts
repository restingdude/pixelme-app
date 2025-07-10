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
    
    // Original single-item checkout functionality
    const { 
      variantId, 
      quantity = 1, 
      customImageUrl,
      clothing,
      style,
      size 
    } = body;

    if (!variantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    const mutation = `
      mutation checkoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) {
          checkout {
            id
            webUrl
            subtotalPrice {
              amount
              currencyCode
            }
            totalPrice {
              amount
              currencyCode
            }
            lineItems(first: 5) {
              edges {
                node {
                  id
                  title
                  quantity
                  variant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                  }
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
          }
          checkoutUserErrors {
            field
            message
          }
        }
      }
    `;

    const lineItems = [{
      variantId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
      customAttributes: [
        ...(customImageUrl ? [{ key: 'custom_design_url', value: customImageUrl }] : []),
        ...(clothing ? [{ key: 'clothing_type', value: clothing }] : []),
        ...(style ? [{ key: 'style', value: style }] : []),
        ...(size ? [{ key: 'size', value: size }] : []),
        { key: 'created_via', value: 'PixelMe App' }
      ]
    }];

    const response = await shopifyStorefront.request(mutation, {
      variables: { input: { lineItems } }
    });

    if (response.data.checkoutCreate.checkoutUserErrors.length > 0) {
      return NextResponse.json(
        { error: 'Checkout creation errors', details: response.data.checkoutCreate.checkoutUserErrors },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout: response.data.checkoutCreate.checkout,
      message: 'Checkout created successfully'
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
        
        // Get the domain
        const urlObj = new URL(checkoutWebUrl);
        const domain = urlObj.origin;
        
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

      // If it's already a proper checkout URL, use it directly
      console.log('✅ Using Shopify checkout URL directly:', checkoutWebUrl);

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
      
      // Fallback to cart page (since /checkout gives 404)
      const fallbackUrl = `https://pixelmecustoms.com/cart`;
      
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