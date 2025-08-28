# Embroidery Size Pricing Implementation

## What's Implemented

✅ **Frontend Changes:**
- Added `getSubjectCost()` function to calculate embroidery fees (line 2063-2068 in edit/page.tsx)
- Modified cart creation to include line item properties for embroidery fees
- Line item properties include:
  - `Design Size`: The selected size (7cm, 10cm, etc.)
  - `Embroidery Fee`: Display value like "+$5" 
  - `_embroidery_fee`: Hidden numeric value for scripts

✅ **API Changes:**
- Updated cart API to handle `properties` parameter
- Properties are stored as attributes with `property_` prefix
- Both createCart() and addToCart() functions support line item properties

## Shopify Setup Required

### Option 1: Shopify Additional Scripts (Current Implementation)
1. Go to **Shopify Admin → Settings → Checkout**
2. Scroll to **Additional Scripts** section
3. Add the content from `shopify-checkout-script.js`
4. **Limitation**: This only shows the fee info to customers, doesn't actually add pricing

### Option 2: Shopify Scripts (Shopify Plus Only) - RECOMMENDED
Create a Line Item Script in Shopify Scripts:

```ruby
# Line Item Script - Embroidery Fee
Input.cart.line_items.each do |line_item|
  # Look for embroidery fee property
  fee_property = line_item.properties['_embroidery_fee']
  
  if fee_property && fee_property.to_f > 0
    fee_amount = fee_property.to_f
    
    # Create a discount that's negative (adds cost)
    discount = LineItemDiscount.new(
      message: "Embroidery Fee (#{line_item.properties['Design Size']})",
      amount: Money.new(cents: -(fee_amount * 100)) # Negative discount = added fee
    )
    
    line_item.apply_discount(discount)
  end
end

Output.cart = Input.cart
```

### Option 3: Draft Orders API (Alternative)
Instead of regular cart, use Draft Orders API to create orders with custom line items:

```javascript
// Create draft order with separate embroidery fee line item
{
  line_items: [
    { variant_id: hoodieVariantId, quantity: 1 },
    { 
      title: `Embroidery Fee (${selectedImageSize})`,
      price: getSizeFee(selectedImageSize),
      quantity: 1,
      custom: true
    }
  ]
}
```

### Option 4: Shopify Functions (New Method)
Use the new Shopify checkout extensibility with Functions API.

## Pricing Structure

| Subject Count | Design Size | Additional Fee |
|---------------|-------------|----------------|
| 1 person      | 7cm         | +$0           |
| 2 people      | 10cm        | +$5           |
| 3 people      | 13cm        | +$10          |
| 4 people      | 16cm        | +$15          |
| 5+ people     | 19cm        | +$20          |

## Testing

1. Add an item to cart with multiple subjects
2. Check cart popup and cart page - should show "7cm design", "10cm design", etc.
3. Go to checkout - fees should appear based on your Shopify setup choice above
4. Complete test purchase to verify pricing

## Next Steps

**Immediate (Option 1):**
- Add the Additional Scripts code to show fee info to customers

**Recommended (Option 2):**  
- Upgrade to Shopify Plus and implement Shopify Scripts for actual pricing
- This will automatically add the fees to the final checkout total

**Alternative (Option 3):**
- Switch to Draft Orders API for full control over pricing
- Requires more backend changes but works on all Shopify plans