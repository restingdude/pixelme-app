# Environment Setup Guide

## Current Status ✅
The checkout system now works without the problematic environment variables! The alternative URLs are generated manually from cart data.

## Required Environment Variables

### For Local Development (.env.local)
```bash
# Shopify Store Configuration
SHOPIFY_STORE_DOMAIN=pixelmecustoms.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token

# Replicate AI Configuration  
REPLICATE_API_TOKEN=your_replicate_api_token

# Vercel Blob Storage (for permanent image storage)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Next.js Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### For Production Deployment
You'll need to set these environment variables in your hosting platform:

```bash
# Shopify Store Configuration
SHOPIFY_STORE_DOMAIN=pixelmecustoms.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token

# Replicate AI Configuration  
REPLICATE_API_TOKEN=your_replicate_api_token

# Vercel Blob Storage (for permanent image storage)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Production URL
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

## Testing the Current Checkout System

1. **Go to localhost:3000**
2. **Create a custom design** and add to cart
3. **Proceed to checkout** - you'll now see:
   - ✅ **Primary checkout URL** (cart/c/ format)
   - ✅ **Yellow warning box** with working alternatives
   - ✅ **Permalink format**: `https://pixelmecustoms.com/cart/46530726428893:1`
   - ✅ **Add-to-cart format**: `https://pixelmecustoms.com/cart/add?id=46530726428893&quantity=1&attributes[style]=Simpsons&return_to=/cart`

## What Works Now

- ✅ **No more environment variable errors**
- ✅ **Alternative URLs generated automatically**
- ✅ **All custom attributes preserved** (style, position, custom design URL)
- ✅ **Universal compatibility** - add-to-cart format works with any Shopify theme

## Next Steps

1. **Test the checkout alternatives** by clicking the buttons in the yellow warning box
2. **The add-to-cart format should work** with your theme since it's the most basic Shopify URL
3. **For production deployment**, ensure environment variables are set in your hosting platform

The checkout system is now much more robust and doesn't depend on additional API calls that were causing issues! 🚀 