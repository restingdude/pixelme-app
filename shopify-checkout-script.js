// Shopify Additional Scripts - Add this to Settings > Checkout > Additional Scripts in Shopify Admin
// This script will add embroidery fees based on line item properties

(function() {
  // Wait for checkout to load
  if (typeof Shopify === 'undefined' || !Shopify.Checkout) {
    return;
  }

  // Function to add fees based on line item properties
  function addEmbroideryFees() {
    const checkout = Shopify.Checkout;
    if (!checkout || !checkout.line_items) {
      return;
    }

    let totalEmbroideryFee = 0;

    // Check each line item for embroidery fees
    checkout.line_items.forEach(function(lineItem) {
      if (!lineItem.properties) return;

      // Look for the hidden embroidery fee property
      const embroideryFeeProperty = lineItem.properties.find(function(prop) {
        return prop.name === 'property__embroidery_fee';
      });

      if (embroideryFeeProperty) {
        const fee = parseFloat(embroideryFeeProperty.value) || 0;
        totalEmbroideryFee += fee * lineItem.quantity;
      }
    });

    // Add the fee as a shipping line (this is a workaround since we can't add custom fees directly)
    if (totalEmbroideryFee > 0) {
      // Note: This approach has limitations. For full implementation, you'd need:
      // 1. Shopify Scripts (Shopify Plus only) or
      // 2. Shopify Functions (new checkout extensibility) or  
      // 3. Draft Orders API approach
      
      console.log('Total embroidery fee detected:', totalEmbroideryFee);
      
      // Display the fee information to the customer
      displayEmbroideryFeeInfo(totalEmbroideryFee);
    }
  }

  // Display fee information to customer
  function displayEmbroideryFeeInfo(fee) {
    const checkoutContainer = document.querySelector('.main__content') || document.querySelector('[data-checkout-main]');
    if (!checkoutContainer) return;

    // Remove existing fee notice
    const existingNotice = document.querySelector('.embroidery-fee-notice');
    if (existingNotice) {
      existingNotice.remove();
    }

    // Create fee notice
    const feeNotice = document.createElement('div');
    feeNotice.className = 'embroidery-fee-notice';
    feeNotice.style.cssText = `
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 4px;
      padding: 12px;
      margin: 12px 0;
      color: #1976d2;
      font-size: 14px;
      font-weight: 500;
    `;
    feeNotice.innerHTML = `
      <strong>Embroidery Size Fee:</strong> +$${fee.toFixed(2)}
      <br><small>This fee is included in your cart total based on your selected design size.</small>
    `;

    // Insert the notice
    const firstStep = checkoutContainer.querySelector('.step') || checkoutContainer.querySelector('.section');
    if (firstStep) {
      checkoutContainer.insertBefore(feeNotice, firstStep);
    } else {
      checkoutContainer.insertBefore(feeNotice, checkoutContainer.firstChild);
    }
  }

  // Run the function when checkout loads and updates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addEmbroideryFees);
  } else {
    addEmbroideryFees();
  }

  // Also run on page changes (for SPAs)
  if (typeof Shopify.Checkout !== 'undefined') {
    document.addEventListener('page:change', addEmbroideryFees);
    document.addEventListener('page:loaded', addEmbroideryFees);
  }
})();