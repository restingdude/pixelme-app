# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

The development server runs on http://localhost:3000.

## Architecture Overview

PixelMe is a Next.js 15 application that transforms user photos into cartoon-style artwork for custom apparel printing through Shopify integration.

### Core Flow
1. **Product Selection**: Users choose clothing type (hoodie/trackies), color, and size from Shopify inventory
2. **Image Upload**: Users upload photos via `/upload` route with file handling through Vercel Blob storage
3. **Style Selection**: Users choose cartoon styles (Simpsons, Family Guy, Ghibli, South Park, Dragon Ball)
4. **AI Conversion**: Images are processed via Replicate AI using the selected style parameters
5. **Image Editing**: Users can crop, remove backgrounds, and adjust images via `/edit`
6. **Color Reduction**: Final embroidery optimization step for production
7. **Shopify Integration**: Cart creation and checkout through Shopify Storefront API

### State Management
- Uses localStorage for persistent user session state across the 7-step workflow
- Key state includes: selected product details, uploaded images, conversion results, editing state
- Cart state managed through Shopify cart ID with local caching

### API Structure (`src/app/api/`)
- **Shopify Integration**: Multiple endpoints for cart management, checkout, products, orders
- **AI Processing**: Replicate API integration for image conversion, background removal, inpainting
- **Image Operations**: Fill, reduce colors, zoom-out functionality
- **Webhook Handling**: Order processing webhooks from Shopify

### Key Libraries
- **Shopify APIs**: `@shopify/admin-api-client`, `@shopify/storefront-api-client` 
- **Image Storage**: `@vercel/blob` for permanent image storage
- **Image Processing**: `sharp` for server-side image manipulation
- **Styling**: TailwindCSS v4 with PostCSS

### Configuration Files
- `next.config.ts`: ESLint ignored during builds
- `src/lib/shopify.ts`: Shopify client configuration and constants
- Environment variables required for Shopify, Replicate, and Vercel Blob integration

### Critical Components
- **Multi-step Workflow**: 7-step process with visual progress indicators and navigation
- **Inventory Management**: Real-time stock checking and low-inventory warnings
- **Responsive Design**: Mobile-first approach with flexible layouts
- **Error Handling**: Graceful fallbacks and user feedback throughout the workflow

See ENVIRONMENT_SETUP.md for complete deployment requirements and testing procedures.