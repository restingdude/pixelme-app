import { NextRequest, NextResponse } from 'next/server';
import { shopifyStorefront } from '../../../../lib/shopify';

// Create a new cart
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('🌐 Cart API POST Request received:');
    console.log('  - Full request body:', JSON.stringify(requestBody, null, 2));
    
    const { action, ...data } = requestBody;

    switch (action) {
      case 'create':
        return await createCart(data);
      case 'add':
        return await addToCart(data);
      case 'update':
        return await updateCart(data);
      case 'remove':
        return await removeFromCart(data);
      case 'clear':
        return await clearCart(data);
      case 'fix-quantities':
        return await fixCartQuantities(data);
      case 'debug-variant':
        return await debugVariant(data);
      case 'list-variants':
        return await listProductVariants(data);
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, add, update, remove, clear, fix-quantities, debug-variant, or list-variants' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Cart API error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to process cart operation', details: error },
      { status: 500 }
    );
  }
}

// Get cart details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get('cartId');

    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart ID is required' },
        { status: 400 }
      );
    }

    const query = `
      query getCart($cartId: ID!) {
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
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
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
                      id
                      title
                      handle
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                    selectedOptions {
                      name
                      value
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

    const response = await shopifyStorefront.request(query, {
      variables: { cartId }
    });

    console.log('Cart API Response:', {
      cartId,
      totalQuantity: response.data.cart?.totalQuantity,
      linesCount: response.data.cart?.lines?.edges?.length,
      fullCart: JSON.stringify(response.data.cart, null, 2)
    });

    return NextResponse.json({
      success: true,
      cart: response.data.cart
    });

  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

// Create a new cart
async function createCart(data: any) {
  console.log('🚀 Creating cart with data:', JSON.stringify(data, null, 2));
  const { variantId, quantity = 1, customAttributes = [] } = data;
  console.log('🔍 Extracted values:');
  console.log('  - Variant ID:', variantId);
  console.log('  - Quantity:', quantity, '(type:', typeof quantity, ')');
  console.log('  - Custom attributes:', JSON.stringify(customAttributes, null, 2));

  // Step 1: Create empty cart first
  const createEmptyCartMutation = `
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
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  console.log('Step 1: Creating empty cart...');
  const emptyCartResponse = await shopifyStorefront.request(createEmptyCartMutation, {
    variables: { 
      input: { 
        attributes: [{ key: 'created_via', value: 'PixelMe App' }]
      } 
    }
  });

  console.log('Empty cart creation response:', JSON.stringify(emptyCartResponse.data, null, 2));

  // Check if cart creation failed
  if (!emptyCartResponse.data.cartCreate || !emptyCartResponse.data.cartCreate.cart) {
    console.error('Empty cart creation failed');
    console.error('User errors:', emptyCartResponse.data.cartCreate?.userErrors);
    return NextResponse.json(
      { error: 'Failed to create empty cart', details: emptyCartResponse.data.cartCreate?.userErrors || 'Unknown error' },
      { status: 400 }
    );
  }

  const cart = emptyCartResponse.data.cartCreate.cart;
  console.log('✅ Empty cart created successfully:', cart.id);

  // Step 2: Add item to the cart if variantId is provided
  if (variantId) {
    console.log('Step 2: Adding item to cart...');
    
    // Skip variant verification for now since it's causing GraphQL errors
    console.log('⚠️ Skipping variant verification, attempting direct add to cart...');
    
    const addLinesMutation = `
      mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
        cartLinesAdd(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
            totalQuantity
            cost {
              totalAmount {
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
                        title
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

    // Directly add item with custom attributes
    const merchandiseId = variantId.startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`;
    const lines = [{
      merchandiseId,
      quantity,
      attributes: customAttributes
    }];

    console.log('🎨 Adding item to cart:');
    console.log('  - Merchandise ID:', merchandiseId);
    console.log('  - Quantity:', quantity, '(type:', typeof quantity, ')');
    console.log('  - Attributes:', JSON.stringify(customAttributes, null, 2));
    console.log('  - Full lines array:', JSON.stringify(lines, null, 2));

    const variables = { cartId: cart.id, lines };
    console.log('🚚 Sending to Shopify GraphQL:');
    console.log('  - Cart ID:', cart.id);
    console.log('  - Variables:', JSON.stringify(variables, null, 2));

    const addLinesResponse = await shopifyStorefront.request(addLinesMutation, {
      variables
    });

    console.log('📦 Add lines response:', JSON.stringify(addLinesResponse.data, null, 2));
    
    if (addLinesResponse.data.cartLinesAdd.userErrors.length > 0) {
      console.log('❌ User errors detected:', addLinesResponse.data.cartLinesAdd.userErrors);
    }
    
    return handleAddResponse(addLinesResponse, cart);
  }

  // Return empty cart if no item to add
  return NextResponse.json({
    success: true,
    cart: cart,
    message: 'Empty cart created successfully'
  });
}

// Helper function to handle add response
function handleAddResponse(addLinesResponse: any, fallbackCart: any) {
  if (addLinesResponse.data.cartLinesAdd.userErrors.length > 0) {
    console.warn('Failed to add item to cart - userErrors:', addLinesResponse.data.cartLinesAdd.userErrors);
    return NextResponse.json({
      success: true,
      cart: fallbackCart,
      message: 'Cart created but failed to add item',
      warning: addLinesResponse.data.cartLinesAdd.userErrors
    });
  }

  // Check if cart is null (silent failure)
  if (!addLinesResponse.data.cartLinesAdd.cart) {
    console.warn('Failed to add item to cart - cart returned null (silent failure)');
    return NextResponse.json({
      success: true,
      cart: fallbackCart,
      message: 'Cart created but item addition failed silently',
      warning: 'Custom attributes may be invalid'
    });
  }

  const cart = addLinesResponse.data.cartLinesAdd.cart;
  
  // FIXME: Check if any items have quantity 0 and try to fix them
  const zeroQuantityItems = cart.lines?.edges?.filter((edge: any) => edge.node.quantity === 0) || [];
  
  if (zeroQuantityItems.length > 0) {
    console.log('🔧 Found items with quantity 0, attempting to fix...');
    // We'll fix this in a separate async operation to not block the response
    fixZeroQuantityItems(cart.id, zeroQuantityItems);
  }

  return NextResponse.json({
    success: true,
    cart: cart,
    message: 'Cart created and item added successfully'
  });
}

// Async function to fix zero quantity items
async function fixZeroQuantityItems(cartId: string, zeroQuantityItems: any[]) {
  try {
    console.log('🔧 Attempting to fix zero quantity items:', zeroQuantityItems.length);
    
    for (const item of zeroQuantityItems) {
      const lineId = item.node.id;
      console.log('🔧 Fixing line:', lineId);
      
      const updateMutation = `
        mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              totalQuantity
              lines(first: 100) {
                edges {
                  node {
                    id
                    quantity
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

      const updateResponse = await shopifyStorefront.request(updateMutation, {
        variables: {
          cartId: cartId,
          lines: [{ id: lineId, quantity: 1 }]
        }
      });

      if (updateResponse.data.cartLinesUpdate.userErrors.length > 0) {
        console.error('❌ Failed to fix zero quantity item:', updateResponse.data.cartLinesUpdate.userErrors);
      } else {
        console.log('✅ Successfully fixed zero quantity item');
      }
    }
  } catch (error) {
    console.error('❌ Error fixing zero quantity items:', error);
  }
}

// Add item to existing cart
async function addToCart(data: any) {
  console.log('🛒 Adding to existing cart with data:', JSON.stringify(data, null, 2));
  const { cartId, variantId, quantity = 1, customAttributes = [] } = data;
  console.log('🔍 Extracted values for addToCart:');
  console.log('  - Cart ID:', cartId);
  console.log('  - Variant ID:', variantId);
  console.log('  - Quantity:', quantity, '(type:', typeof quantity, ')');
  console.log('  - Custom attributes:', JSON.stringify(customAttributes, null, 2));

  if (!cartId || !variantId) {
    return NextResponse.json(
      { error: 'Cart ID and Variant ID are required' },
      { status: 400 }
    );
  }

  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
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
                      title
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

  const merchandiseId = variantId.startsWith('gid://') ? variantId : `gid://shopify/ProductVariant/${variantId}`;
  
  const lines = [{
    merchandiseId,
    quantity,
    attributes: customAttributes
  }];

  console.log('🎯 Adding to existing cart:');
  console.log('  - Merchandise ID:', merchandiseId);
  console.log('  - Quantity:', quantity, '(type:', typeof quantity, ')');
  console.log('  - Attributes:', JSON.stringify(customAttributes, null, 2));
  console.log('  - Full lines array:', JSON.stringify(lines, null, 2));

  const variables = { cartId, lines };
  console.log('🚚 Sending to Shopify GraphQL (addToCart):');
  console.log('  - Variables:', JSON.stringify(variables, null, 2));

  const response = await shopifyStorefront.request(mutation, {
    variables
  });

  console.log('📦 AddToCart response:', JSON.stringify(response.data, null, 2));

  if (response.data.cartLinesAdd.userErrors.length > 0) {
    console.log('❌ AddToCart user errors:', response.data.cartLinesAdd.userErrors);
    return NextResponse.json(
      { error: 'Add to cart errors', details: response.data.cartLinesAdd.userErrors },
      { status: 400 }
    );
  }

  const cart = response.data.cartLinesAdd.cart;
  
  // FIXME: Check if any items have quantity 0 and try to fix them
  const zeroQuantityItems = cart.lines?.edges?.filter((edge: any) => edge.node.quantity === 0) || [];
  
  if (zeroQuantityItems.length > 0) {
    console.log('🔧 Found items with quantity 0 in addToCart, attempting to fix...');
    // We'll fix this in a separate async operation to not block the response
    fixZeroQuantityItems(cart.id, zeroQuantityItems);
  }

  return NextResponse.json({
    success: true,
    cart: cart,
    message: 'Item added to cart successfully'
  });
}

// Update cart line quantity
async function updateCart(data: any) {
  const { cartId, lineId, quantity } = data;

  if (!cartId || !lineId || quantity === undefined) {
    return NextResponse.json(
      { error: 'Cart ID, Line ID, and quantity are required' },
      { status: 400 }
    );
  }

  console.log('🔄 Updating cart quantity:');
  console.log('  - Cart ID:', cartId);
  console.log('  - Line ID:', lineId);
  console.log('  - New Quantity:', quantity, '(type:', typeof quantity, ')');

  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount {
                    amount
                    currencyCode
                  }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    availableForSale
                    currentlyNotInStock
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

  const variables = {
    cartId,
    lines: [{ id: lineId, quantity }]
  };

  console.log('🚚 Sending cart update to Shopify:');
  console.log('  - Variables:', JSON.stringify(variables, null, 2));

  const response = await shopifyStorefront.request(mutation, {
    variables
  });

  console.log('📦 Cart update response:', JSON.stringify(response.data, null, 2));

  if (response.data.cartLinesUpdate.userErrors.length > 0) {
    console.error('❌ Cart update errors:', response.data.cartLinesUpdate.userErrors);
    return NextResponse.json(
      { error: 'Update cart errors', details: response.data.cartLinesUpdate.userErrors },
      { status: 400 }
    );
  }

  const updatedCart = response.data.cartLinesUpdate.cart;
  
  // Check if cart update returned null (indicates failure)
  if (!updatedCart) {
    console.error('❌ Cart update failed - cart returned null (likely variant not available for sale)');
    return NextResponse.json(
      { 
        error: 'Cart update failed', 
        details: 'The item may not be available for sale. Try removing the item and adding it again.',
        userErrors: ['Cart update returned null - variant may not be available for sale']
      },
      { status: 400 }
    );
  }
  
  // Check if the quantity was actually updated
  const updatedLine = updatedCart.lines.edges.find((edge: any) => edge.node.id === lineId);
  if (updatedLine && updatedLine.node.quantity === 0) {
    console.warn('⚠️ Quantity update succeeded but quantity is still 0 - possible inventory issue');
  }

  return NextResponse.json({
    success: true,
    cart: updatedCart,
    message: 'Cart updated successfully'
  });
}

// Remove item from cart
async function removeFromCart(data: any) {
  const { cartId, lineIds } = data;

  if (!cartId || !lineIds || !Array.isArray(lineIds)) {
    return NextResponse.json(
      { error: 'Cart ID and Line IDs array are required' },
      { status: 400 }
    );
  }

  console.log('🗑️ Removing items from cart:', { cartId, lineIds });

  // First get the current cart to verify items exist
  const getCartQuery = `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        lines(first: 100) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `;

  const beforeResponse = await shopifyStorefront.request(getCartQuery, {
    variables: { cartId }
  });

  const beforeLineIds = beforeResponse.data.cart?.lines?.edges?.map((edge: any) => edge.node.id) || [];
  console.log('📋 Items in cart before removal:', beforeLineIds.length);

  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
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

  const response = await shopifyStorefront.request(mutation, {
    variables: { cartId, lineIds }
  });

  console.log('🗑️ Remove response:', JSON.stringify(response.data, null, 2));

  if (response.data.cartLinesRemove.userErrors.length > 0) {
    console.error('❌ Remove cart errors:', response.data.cartLinesRemove.userErrors);
    return NextResponse.json(
      { error: 'Remove from cart errors', details: response.data.cartLinesRemove.userErrors },
      { status: 400 }
    );
  }

  const updatedCart = response.data.cartLinesRemove.cart;
  
  // Check if cart removal returned null (indicates failure)
  if (!updatedCart) {
    console.error('❌ Remove from cart failed - cart returned null');
    return NextResponse.json(
      { 
        error: 'Remove from cart failed', 
        details: 'The item may not be removable due to product configuration. Try clearing the entire cart.',
        userErrors: ['Cart removal returned null - variant may not be available for sale']
      },
      { status: 400 }
    );
  }

  // Verify that the items were actually removed
  const afterLineIds = updatedCart.lines?.edges?.map((edge: any) => edge.node.id) || [];
  console.log('📋 Items in cart after removal:', afterLineIds.length);
  
  const removedItems = lineIds.filter(id => !afterLineIds.includes(id));
  const stillPresent = lineIds.filter(id => afterLineIds.includes(id));
  
  if (stillPresent.length > 0) {
    console.warn('⚠️ Some items were not removed from cart:', stillPresent);
    return NextResponse.json(
      { 
        error: 'Some items could not be removed', 
        details: 'Items may not be removable due to product configuration. Try using "Clear Cart" instead.',
        stillPresent,
        removedItems
      },
      { status: 400 }
    );
  }

  console.log('✅ Successfully removed items:', removedItems);

  return NextResponse.json({
    success: true,
    cart: updatedCart,
    message: 'Item removed from cart successfully',
    removedItems
  });
}

// Clear all items from cart
async function clearCart(data: any) {
  const { cartId } = data;

  if (!cartId) {
    return NextResponse.json(
      { error: 'Cart ID is required' },
      { status: 400 }
    );
  }

  // First get all line IDs
  const getCartQuery = `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        lines(first: 100) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `;

  const cartResponse = await shopifyStorefront.request(getCartQuery, {
    variables: { cartId }
  });

  const lineIds = cartResponse.data.cart?.lines?.edges?.map((edge: any) => edge.node.id) || [];

  if (lineIds.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Cart is already empty'
    });
  }

  // Remove all items
  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
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

  const response = await shopifyStorefront.request(mutation, {
    variables: { cartId, lineIds }
  });

  if (response.data.cartLinesRemove.userErrors.length > 0) {
    return NextResponse.json(
      { error: 'Clear cart errors', details: response.data.cartLinesRemove.userErrors },
      { status: 400 }
    );
  }

  const clearedCart = response.data.cartLinesRemove.cart;
  
  // Check if cart clear returned null (indicates failure)
  if (!clearedCart) {
    console.error('❌ Clear cart failed - cart returned null');
    return NextResponse.json(
      { 
        error: 'Clear cart failed', 
        details: 'Failed to clear the cart. Please try again.',
        userErrors: ['Cart clear returned null']
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    cart: clearedCart,
    message: 'Cart cleared successfully'
  });
}

// New action to manually fix cart quantities when they are 0
async function fixCartQuantities(data: any) {
  const { cartId } = data;

  if (!cartId) {
    return NextResponse.json(
      { error: 'Cart ID is required' },
      { status: 400 }
    );
  }

  // First get all line IDs
  const getCartQuery = `
    query getCart($cartId: ID!) {
      cart(id: $cartId) {
        lines(first: 100) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `;

  const cartResponse = await shopifyStorefront.request(getCartQuery, {
    variables: { cartId }
  });

  const lineIds = cartResponse.data.cart?.lines?.edges?.map((edge: any) => edge.node.id) || [];

  if (lineIds.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'Cart is already empty'
    });
  }

  // Fix all quantities
  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
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

  const response = await shopifyStorefront.request(mutation, {
    variables: {
      cartId,
      lines: lineIds.map((id: string) => ({ id, quantity: 1 }))
    }
  });

  if (response.data.cartLinesUpdate.userErrors.length > 0) {
    return NextResponse.json(
      { error: 'Fix cart errors', details: response.data.cartLinesUpdate.userErrors },
      { status: 400 }
    );
  }

  const updatedCart = response.data.cartLinesUpdate.cart;
  
  // Check if cart update returned null (indicates failure)
  if (!updatedCart) {
    console.error('❌ Fix cart quantities failed - cart returned null (likely variant not available for sale)');
    return NextResponse.json(
      { 
        error: 'Fix cart quantities failed', 
        details: 'One or more items may not be available for sale. Try clearing the cart and starting fresh.',
        userErrors: ['Cart update returned null - variant may not be available for sale']
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    cart: updatedCart,
    message: 'Cart quantities fixed successfully'
  });
}

// Debug action to check variant details
async function debugVariant(data: any) {
  const { variantId } = data;

  if (!variantId) {
    return NextResponse.json(
      { error: 'Variant ID is required' },
      { status: 400 }
    );
  }

  console.log('🔍 Debugging variant:', variantId);

  const query = `
    query getVariantDetails($id: ID!) {
      productVariant(id: $id) {
        id
        title
        price {
          amount
          currencyCode
        }
        availableForSale
        quantityAvailable
        inventoryManagement
        inventoryPolicy
        inventoryQuantity
        currentlyNotInStock
        requiresShipping
        sku
        weight
        weightUnit
        product {
          id
          title
          handle
          status
          productType
          vendor
          availableForSale
          tags
        }
      }
    }
  `;

  try {
    const response = await shopifyStorefront.request(query, {
      variables: { id: variantId }
    });

    console.log('🔍 Variant debug response:', JSON.stringify(response.data, null, 2));

    return NextResponse.json({
      success: true,
      variant: response.data.productVariant,
      message: 'Variant details retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error debugging variant:', error);
    return NextResponse.json(
      { error: 'Failed to debug variant', details: error },
      { status: 500 }
    );
  }
}

// List all variants for a product to find available ones
async function listProductVariants(data: any) {
  const { productId = 'gid://shopify/Product/9024970850525' } = data; // Default to Hoodie

  console.log('📋 Listing variants for product:', productId);

  const query = `
    query getProductVariants($productId: ID!) {
      product(id: $productId) {
        id
        title
        handle
        variants(first: 50) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
              quantityAvailable
              inventoryManagement
              inventoryPolicy
              inventoryQuantity
              currentlyNotInStock
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await shopifyStorefront.request(query, {
      variables: { productId }
    });

    console.log('📋 Product variants response:', JSON.stringify(response.data, null, 2));

    const product = response.data.product;
    const variants = product?.variants?.edges || [];
    
    // Separate available and unavailable variants
    const availableVariants = variants.filter((edge: any) => edge.node.availableForSale);
    const unavailableVariants = variants.filter((edge: any) => !edge.node.availableForSale);

    console.log(`✅ Available variants: ${availableVariants.length}`);
    console.log(`❌ Unavailable variants: ${unavailableVariants.length}`);

    return NextResponse.json({
      success: true,
      product: {
        id: product?.id,
        title: product?.title,
        handle: product?.handle
      },
      variants: variants.map((edge: any) => edge.node),
      summary: {
        total: variants.length,
        available: availableVariants.length,
        unavailable: unavailableVariants.length
      },
      message: 'Product variants retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error listing variants:', error);
    return NextResponse.json(
      { error: 'Failed to list variants', details: error },
      { status: 500 }
    );
  }
}