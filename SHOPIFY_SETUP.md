# PixelMe + Shopify Integration Setup Guide

## Required Environment Variables

Create a `.env.local` file in the `pixelme` directory with the following variables:

```bash
# Replicate API for image processing (existing)
REPLICATE_API_TOKEN=your_replicate_api_token_here

# Shopify Admin API (for managing products, orders, customers)
SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token-here

# Shopify Storefront API (for customer checkout)
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token-here

# 99fb2955474e69198fd12193ba3203f8
```

## Shopify Setup Steps

### 1. Create a Shopify Store
- Go to [Shopify](https://www.shopify.com/) and create a new store
- Note your store domain (e.g., `your-store-name.myshopify.com`)

### 2. Create a Private App for Admin API
1. In your Shopify admin, go to Apps > App and sales channel settings
2. Click "Develop apps for your store"
3. Click "Create an app"
4. Name it "PixelMe Admin" and create the app
5. Go to "Configuration" tab
6. Under "Admin API access scopes", enable:
   - `read_products` and `write_products`
   - `read_orders` and `write_orders`
   - `read_customers` and `write_customers`
   - `read_draft_orders` and `write_draft_orders`
   - `read_inventory` and `write_inventory`
7. Click "Save"
8. Go to "API credentials" tab
9. Install the app and copy the "Admin API access token"

### 3. Create Storefront Access Token
1. In your Shopify admin, go to Apps > App and sales channel settings
2. Click "Develop apps for your store"
3. Click "Create an app" (or use the same app from step 2)
4. Go to "Configuration" tab
5. Under "Storefront API access scopes", enable:
   - `unauthenticated_read_products`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`
6. Click "Save"
7. Go to "API credentials" tab
8. Copy the "Storefront access token"

## Installation Commands

After setting up environment variables, run these commands:

```bash
cd pixelme
npm install
npm run dev
```

## API Endpoints Created

- `POST /api/shopify/products` - Create products
- `GET /api/shopify/products` - Get products
- `PUT /api/shopify/products` - Update products
- `DELETE /api/shopify/products` - Delete products
- `POST /api/shopify/orders` - Create orders
- `GET /api/shopify/orders` - Get orders
- `POST /api/shopify/checkout` - Create checkout
- `GET /api/shopify/checkout` - Get checkout details

## Usage Flow

1. User designs their custom clothing in PixelMe
2. User selects size and proceeds to checkout
3. System creates Shopify product (if doesn't exist)
4. System creates checkout with custom design URL attached
5. User is redirected to Shopify checkout
6. Order is processed through Shopify
7. Custom design URL is available in order details for fulfillment

## Product Structure

Each combination of clothing type + style will create a separate product in Shopify with variants for different sizes:

- Product: "Custom Hoodie - Simpsons Style"
  - Variant: XS, S, M, L, XL, XXL
- Product: "Custom Trackies - Dragon Ball Style"
  - Variant: XS, S, M, L, XL, XXL

Custom design URLs are stored as line item attributes in orders. 