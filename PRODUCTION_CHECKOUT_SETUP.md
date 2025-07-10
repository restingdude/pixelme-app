# Production Checkout Setup Guide

You now have a **real production checkout system** that processes actual payments! Here's how to deploy and use it.

## 🎯 **What You've Implemented**

✅ **Mock Checkout** - For localhost testing only  
✅ **Real Checkout System** - Production-ready payment processing  
✅ **Modern Shopify API** - Uses latest checkout methods with 3 fallback approaches  
✅ **Webhook Integration** - Receives order notifications  
✅ **Success Page** - Customer return flow after payment  
✅ **Smart Detection** - Automatically switches between mock and real checkout  

## 📋 **Deploy Checklist**

### 1. **Deploy to Production**
First, deploy your app to your production domain:

```bash
# Build and deploy to production
npm run build
# Deploy to your hosting provider (Vercel, Netlify, etc.)
```

### 2. **Update Environment Variables**
Ensure these are set in production:

```env
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token
SHOPIFY_STORE_DOMAIN=pixelmecustoms.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. **Configure Shopify Store**

#### A. **Enable Checkout Settings**
In Shopify Admin:
- Go to `Settings > Payments`
- Enable your payment methods (Stripe, PayPal, etc.)
- Set up your checkout settings

#### B. **Configure Product Variants**
Make sure ALL your product variants are:
- ✅ **Available for sale** (crucial!)
- ✅ **Track quantity** enabled  
- ✅ **Continue selling when out of stock** enabled

#### C. **Set Up Webhooks** (Optional but Recommended)
Follow the `WEBHOOK_SETUP.md` guide to receive order notifications.

### 4. **Test Production Checkout**

#### On localhost (`http://localhost:3000`):
- When you click "Proceed to Checkout", you'll get a choice:
  - **"OK"** = Mock checkout (testing only)
  - **"Cancel"** = Real checkout (uses production system)

#### On production (`https://pixelmecustoms.com`):
- Always uses real checkout automatically
- Processes actual payments through Shopify

## 🔧 **How It Works**

### **Smart Checkout Detection**
Your app automatically chooses the right checkout method:

```javascript
// Localhost detection
const isLocalhost = hostname === 'localhost' || port === '3000';

if (isLocalhost) {
  // Show choice: Mock vs Real checkout
} else {
  // Always use real checkout in production
}
```

### **Three Checkout Methods**
Your real checkout API tries multiple approaches for maximum compatibility:

1. **Modern Cart Checkout** (Primary)
   - Uses Shopify's cart.checkoutUrl
   - Converts `/cart/c/` URLs to `/checkouts/c/` 
   - Best compatibility with modern Shopify

2. **Embedded Checkout** (Fallback)
   - Creates checkout via checkoutCreate mutation
   - Works with older Shopify setups

3. **Direct Store Checkout** (Last Resort)
   - Redirects to product pages
   - Always works as final fallback

### **Payment Flow**
1. Customer adds items to cart
2. Clicks "Proceed to Checkout"
3. Redirected to `/checkout-real` page
4. Real checkout API creates Shopify checkout URL
5. Customer redirected to Shopify's secure checkout
6. Payment processed by Shopify
7. Customer returns to your success page
8. Webhooks notify your app of order completion

## 🛠️ **API Endpoints**

### **Modern Checkout API**
- **URL:** `/api/shopify/checkout-v2`
- **Method:** POST
- **Body:** `{ "cartId": "cart_id_here" }`

### **Order Sync API**
- **URL:** `/api/shopify/sync-order`
- **Method:** POST
- **Body:** `{ "orderId": "order_id_here" }`

### **Webhook Handler**
- **URL:** `/api/shopify/webhooks`
- **Method:** POST
- **Handles:** Order creation, payment, fulfillment, cancellation

## 🎨 **Custom Design Integration**

Your checkout system preserves all custom design data:
- ✅ Custom artwork URLs
- ✅ Style selections (Simpsons, Anime, etc.)
- ✅ Position settings (middle-chest, etc.)
- ✅ Clothing type and size

This data flows through:
1. **Cart attributes** → 2. **Checkout line items** → 3. **Order metadata** → 4. **Webhook processing**

## 🔍 **Testing Checklist**

### **Localhost Testing**
- [ ] Start dev server: `npm run dev`
- [ ] Add items to cart
- [ ] Click checkout → Choose "Real checkout"
- [ ] Verify redirect to `/checkout-real`
- [ ] Check console for successful checkout URL creation

### **Production Testing**
- [ ] Deploy to production domain
- [ ] Add test items to cart
- [ ] Complete full checkout flow
- [ ] Verify payment processing
- [ ] Check order appears in Shopify admin
- [ ] Test webhook notifications (if configured)

## ⚠️ **Important Notes**

### **Security**
- All payments processed by Shopify (PCI compliant)
- Your app never handles credit card data
- SSL/HTTPS required for production

### **Order Management**
- Orders managed in Shopify Admin
- Use webhooks to sync order status
- Custom design data preserved in order metadata

### **Troubleshooting**
If checkout URLs return 404:
1. Check Shopify store domain configuration
2. Verify Storefront API permissions
3. Ensure product variants are "Available for sale"
4. Check browser console for detailed error messages

## 🚀 **Go Live**

Once everything is tested:

1. **Remove mock checkout** (optional):
   ```javascript
   // In cart pages, remove the confirm() choice dialog
   // Always redirect to real checkout
   ```

2. **Monitor orders** in Shopify Admin

3. **Set up webhook notifications** for order automation

4. **Configure fulfillment** for custom clothing production

Your PixelMe app now has a fully functional e-commerce checkout system! 🎉

## 🔗 **Next Steps**

- Set up order fulfillment automation
- Configure shipping settings
- Add order tracking for customers
- Implement inventory management
- Set up email notifications

**Ready to start selling custom PixelMe clothing with real payments!** 💳✨ 