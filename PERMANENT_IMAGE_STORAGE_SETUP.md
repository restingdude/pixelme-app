# Permanent Image Storage Setup Guide

## **🎯 Problem Solved:**
When customers create custom PixelMe designs, Replicate generates temporary URLs that expire after some time. This setup ensures that when orders are paid, all custom design images are automatically saved to permanent storage that never expires.

## **✅ Solution: Vercel Blob Storage + Order Webhooks**

### **Step 1: Get Your Vercel Blob Storage Token**

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your PixelMe project

2. **Create Blob Storage:**
   - Go to **Storage** tab
   - Click **Create Store**
   - Choose **Blob** as the storage type
   - Name it: `pixelme-images`
   - Click **Create**

3. **Get Your Token:**
   - After creating the store, copy the **Read/Write Token**
   - It looks like: `vercel_blob_rw_xxxxxxxxxxxxx`

### **Step 2: Add Environment Variable**

Add this to your `.env.local` file:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_actual_token_here
```

**For Production:** Add the same variable in Vercel Dashboard → Project → Settings → Environment Variables

### **Step 3: How It Works**

#### **Cart-Triggered Image Saving:**
1. ✅ Customer does ALL edits (crop, rotate, fill, convert, etc.) → **Temporary Replicate URLs**
2. ✅ Customer adds to cart → **Automatic conversion to permanent URLs for cart display**
3. ✅ Customer goes to checkout → **Clean checkout with NO image URLs displayed**
4. ✅ **When payment is completed** → **Additional backup copy saved for order organization**
5. ✅ **Order fulfillment** → **Permanent URLs available for production team**
6. ✅ **Optimized Efficiency:** Only save images when customers show purchase intent!

#### **File Organization:**
```
blob-storage/
├── designs/                          # 🛒 CART ADDITIONS (by date)
│   ├── 2024/01/15/
│   │   ├── hoodie-dragon-ball-1699123456789.png
│   │   └── hoodie-simpsons-1699123456790.png
│   ├── 2024/01/16/
│   │   └── trackies-studio-ghibli-1699123456791.png
│   └── 2024/01/17/
│       └── hoodie-rick-and-morty-1699123456792.png
└── orders/                           # 💰 PAID ORDERS (organized backup)
    ├── 12345/designs/
    │   ├── item-67890-dragon-ball-1699123456789.png
    │   └── item-67891-simpsons-1699123456790.png
    └── 12346/designs/
        └── item-67892-studio-ghibli-1699123456791.png
```

#### **URL Strategy:**
- **During Design Process:** `https://replicate.delivery/temp123/output.png` (temporary, expires in ~24 hours)
- **When Added to Cart:** `https://blob.store.vercel-storage.com/designs/2024/01/15/hoodie-dragon-ball-1699123456.png` (permanent forever)
- **In Checkout:** No image URLs displayed (clean, professional checkout)
- **After Payment:** `https://blob.store.vercel-storage.com/orders/12345/designs/item-67890-dragon-ball.png` (organized backup)
- **✅ Smart Efficiency:** Only save images when customers show purchase intent
- **✅ Perfect UX:** Permanent cart preview + clean checkout + organized fulfillment
- **✅ Date Organization:** Easy to find and manage files by date

### **Step 4: Cart & Checkout Experience**

#### **What Customers See:**
- **Cart Page:** Permanent custom design preview with style, size, and position details (perfect UX!)
- **Checkout Page:** Clean product details only - no confusing URLs
- **After Payment:** Production team gets organized permanent URLs for fulfillment

#### **Technical Benefits:**
- **Smart URL Management:** Permanent images in cart, hidden from checkout
- **No Broken Links:** Cart shows permanent URLs that never expire
- **Purchase Intent Filtering:** Only save images when customers add to cart
- **Date-Based Organization:** Easy to find, manage, and analyze files by date
- **Clean Data Flow:** Perfect balance of UX, efficiency, and reliability

### **Step 5: Monitoring & Logs**

**During Design Creation:**
```
🎨 Generated design: Dragon Ball style
✅ Returning temporary Replicate URL to frontend
🔄 Image will be saved permanently when added to cart
```

**When Added to Cart (Automatic Conversion):**
```
🛒 Adding to cart: Dragon Ball Hoodie - L/Black
🎨 Final image is temporary Replicate URL, converting to permanent storage for cart...
💾 Saving design to permanent storage: { style: "Dragon Ball", clothing: "hoodie" }
📦 Image downloaded: { size: 245760, contentType: "image/png", sizeKB: 240 }
✅ Design saved to permanent storage: { url: "https://blob.store.vercel-storage.com/designs/2024/01/15/..." }
✅ Converted to permanent URL for cart: blob.store.vercel-storage.com/designs/2024/01/15/hoodie-dragon-ball-...
```

**When Orders are Paid (Organized Backup):**
```
💰 Order Paid: { id: 12345, orderNumber: "#PX1001" }
🎨 Starting organized backup for paid order...
🎨 Found 2 custom design items to backup
✅ Backup copies saved to order-specific folders
📊 Order backup summary: { successRate: "100%" }
```

### **Step 5: Testing**

#### **Test the Setup:**
1. Create a custom design and place an order
2. Complete payment (or use test mode)
3. Check your Vercel project logs
4. Look for the "Image preservation summary" messages
5. Verify images are saved in Vercel Blob Storage

#### **Manual Image Saving (if needed):**
If you have existing orders with expiring URLs, you can manually trigger image saving by setting up a simple API endpoint.

### **Step 6: Benefits**

✅ **Smart Cost Efficiency:** Only save images when customers show purchase intent!  
✅ **No Wasted Storage:** Don't save abandoned carts, test designs, or browsing sessions  
✅ **Reliable Order Fulfillment:** Permanent images available when you need them for production  
✅ **Zero Manual Work:** Completely automatic cart-triggered saving  
✅ **Date-Organized Storage:** Clean date-based file structure for easy management  
✅ **Lightning Fast:** Vercel CDN ensures instant global image loading  
✅ **Bulletproof Reliability:** Never lose a design once added to cart  
✅ **Scalable:** Handles unlimited designs automatically  
✅ **Analytics Friendly:** Easy to track design creation trends by date  

### **Step 7: What Happens to Old URLs?**

#### **Current Behavior:**
- Cart/checkout still uses Replicate URLs temporarily
- These work fine for immediate orders
- **NEW:** When payment is completed, permanent copies are saved

#### **Future Enhancement (Optional):**
You could later update the system to:
1. Save images immediately after creation
2. Use permanent URLs in cart/checkout
3. This would eliminate any dependency on Replicate URLs

### **Step 8: Troubleshooting**

#### **Common Issues:**

**No images being saved?**
- Check that `BLOB_READ_WRITE_TOKEN` is set correctly
- Verify webhook is receiving "orders/paid" events
- Check logs for error messages

**Images failing to save?**
- Check that Replicate URLs are still valid when webhook fires
- Verify blob storage permissions
- Check network connectivity from your server

**Need to save existing orders?**
- You can create a one-time script to process historical orders
- Extract custom_design_url from existing order data
- Save any non-expired images

## **🎉 Cost-Efficient Solution Ready!**

Once you add the `BLOB_READ_WRITE_TOKEN` environment variable:

### **✅ Smart Behavior:**
- **Design creation = Temporary Replicate URLs (perfect for editing)**
- **Add to cart = Automatic conversion to permanent URLs (great customer experience)**
- **Checkout = Clean product details only (no confusing URLs)**
- **Payment completed = Organized backup copy saved for fulfillment**
- **Optimized efficiency: Only save when customers show purchase intent**

### **✅ Updated System:**
- **All API routes** - Return temporary Replicate URLs for editing
- **Cart display** - Shows custom design preview for great UX
- **Checkout process** - No image URLs displayed (clean & professional)
- **Webhook on order payment** - Automatically saves images to permanent storage
- **Clean organization** - Only paid orders stored permanently

### **🚀 Your System is Now Perfectly Optimized:**
Ideal balance of customer experience, performance, and cost efficiency! Customers see permanent design previews in cart, checkout is clean and professional, and your fulfillment team gets organized permanent URLs. You only pay for storage when customers show real purchase intent by adding to cart! Smart efficiency, perfect UX, zero waste! 💰✨ 