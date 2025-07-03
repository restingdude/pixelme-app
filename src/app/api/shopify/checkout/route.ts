import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Create a checkout session
export async function POST(request: NextRequest) {
  try {
    const { 
      variantId, 
      quantity = 1, 
      customImageUrl,
      clothing,
      style,
      size 
    } = await request.json();

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