# Shopify Webhook Setup for Order Sync

This guide explains how to set up Shopify webhooks to automatically sync order data with your PixelMe admin dashboard.

## **What This Provides:**

✅ **Real-time order notifications** in your server logs  
✅ **Automatic sync** between Shopify and your admin dashboard  
✅ **PixelMe order tracking** with custom design data  
✅ **Webhook security** with signature verification  

## **1. Environment Variables**

Add this to your `.env.local`:

```bash
# Webhook Security (optional but recommended)
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
```

## **2. Shopify Admin Setup**

### **Step 1: Go to Shopify Admin**
1. Navigate to **Settings** → **Notifications**
2. Scroll down to **Webhooks** section
3. Click **Create webhook**

### **Step 2: Create Order Webhooks**

Create **4 separate webhooks** for different order events:

#### **Webhook 1: Order Created**
- **Event**: `Order creation`
- **Format**: `JSON`
- **URL**: `https://yourdomain.com/api/shopify/webhooks/orders`
- **Webhook API version**: `2023-10` (latest)

#### **Webhook 2: Order Paid**
- **Event**: `Order payment`
- **Format**: `JSON`
- **URL**: `https://yourdomain.com/api/shopify/webhooks/orders`
- **Webhook API version**: `2023-10`

#### **Webhook 3: Order Fulfilled**
- **Event**: `Order fulfillment`
- **Format**: `JSON`
- **URL**: `https://yourdomain.com/api/shopify/webhooks/orders`
- **Webhook API version**: `2023-10`

#### **Webhook 4: Order Cancelled**
- **Event**: `Order cancellation`
- **Format**: `JSON`
- **URL**: `https://yourdomain.com/api/shopify/webhooks/orders`
- **Webhook API version**: `2023-10`

### **Step 3: Add Webhook Security (Recommended)**

For each webhook:
1. Click **Show webhook signing secret**
2. Copy the secret key
3. Add it to your `.env.local` as `SHOPIFY_WEBHOOK_SECRET`

**Note**: All webhooks will share the same secret if created in the same store.

## **3. Testing Webhooks**

### **Test with Ngrok (Development)**

If testing locally:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL in webhook setup
# Example: https://abc123.ngrok.io/api/shopify/webhooks/orders
```

### **Create Test Order**

1. Go to your **PixelMe app**
2. Create a custom design and add to cart
3. Complete checkout process
4. Check your **server logs** for webhook events

You should see logs like:
```
📦 Order Webhook Received: {
  topic: 'orders/create',
  orderId: 5234567890,
  orderNumber: 1001,
  email: 'customer@example.com',
  totalPrice: '108.00'
}

🎨 Custom PixelMe Items Found:
  Item 1: Hoodie - M / Beige
  Custom Properties: {
    custom_design_url: 'https://replicate.delivery/...',
    style: 'Studio Ghibli',
    position: 'middle-chest',
    clothing_type: 'hoodie'
  }
```

## **4. Admin Dashboard Integration**

### **View Orders**

Your admin now has order management:

1. **Admin Dashboard** → **View Orders** button
2. **Filter by type**: All Orders, PixelMe Orders, Regular Orders
3. **Filter by status**: Any, Open, Closed, Cancelled
4. **PixelMe Order Summary**: Revenue, custom designs count

### **Order Data Available**

- ✅ **Customer information** (name, email, address)
- ✅ **Payment status** (paid, pending, refunded)
- ✅ **Fulfillment status** (fulfilled, unfulfilled)
- ✅ **Custom design URLs** and attributes
- ✅ **Order totals** and item counts

## **5. Webhook Event Details**

### **Order Created (`orders/create`)**
- Triggered when draft order becomes real order
- Contains all customer and item data
- **Perfect for** triggering production workflows

### **Order Paid (`orders/paid`)**
- Triggered when payment is completed
- **Perfect for** confirming payment and starting fulfillment

### **Order Fulfilled (`orders/fulfilled`)**
- Triggered when order is marked as fulfilled
- Contains tracking information
- **Perfect for** sending shipping notifications

### **Order Cancelled (`orders/cancelled`)**
- Triggered when order is cancelled
- **Perfect for** handling refunds and inventory

## **6. Custom Integration Options**

You can extend the webhook handler in `/api/shopify/webhooks/orders/route.ts`:

```javascript
async function handleOrderCreated(order) {
  // Your custom logic here:
  
  // 1. Send to production system
  // await sendToProductionAPI(order);
  
  // 2. Save to database
  // await saveOrderToDatabase(order);
  
  // 3. Send custom emails
  // await sendCustomConfirmationEmail(order);
  
  // 4. Update inventory systems
  // await updateInventorySystem(order);
}
```

## **7. Security Best Practices**

✅ **Use HTTPS** for webhook URLs  
✅ **Verify webhook signatures** (automatic with `SHOPIFY_WEBHOOK_SECRET`)  
✅ **Rate limiting** (consider implementing)  
✅ **Error handling** (already implemented)  

## **8. Troubleshooting**

### **Webhooks Not Firing?**
- Check webhook URL is accessible
- Verify HTTPS is working
- Check Shopify webhook delivery status in admin

### **Signature Verification Failing?**
- Ensure `SHOPIFY_WEBHOOK_SECRET` matches Shopify admin
- Check URL encoding in webhook setup

### **Missing Order Data?**
- Confirm webhook API version is `2023-10`
- Check webhook format is `JSON`

## **Benefits of This Setup**

🎯 **Complete Order Visibility**: See all orders in both Shopify admin AND your custom dashboard  
🎨 **PixelMe Data Preserved**: Custom designs, styles, and positions tracked throughout  
📊 **Business Insights**: Revenue tracking specifically for custom orders  
🔄 **Real-time Sync**: Instant updates when orders change status  
💼 **Professional Workflow**: Automated notifications and processing  

**Your headless checkout now has full enterprise-level order management!** 🚀 