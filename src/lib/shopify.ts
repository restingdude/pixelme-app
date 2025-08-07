import { createAdminApiClient } from '@shopify/admin-api-client';
import { createStorefrontApiClient } from '@shopify/storefront-api-client';

// Admin API client for managing products, orders, customers, etc.
export const shopifyAdmin = createAdminApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  apiVersion: '2024-10',
  accessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
});

// Storefront API client for customer-facing operations
export const shopifyStorefront = createStorefrontApiClient({
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN!,
  apiVersion: '2024-10',
  publicAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!,
});

// Product types for PixelMe
export const PRODUCT_TYPES = {
  HOODIE: 'hoodie',
  TRACKIES: 'trackies',
} as const;

// Style types available in PixelMe
export const STYLE_TYPES = {
  YELLOW_CARTOON: 'Yellow Cartoon',
  ANIMATED_COMEDY: 'Animated Comedy',
  ANIME_FANTASY: 'Anime Fantasy',
  PAPER_ANIMATION: 'Paper Animation',
  ACTION_ANIME: 'Action Anime',

} as const;

// Colors available for clothing
export const CLOTHING_COLORS = {
  BLACK: 'Black',
  WHITE: 'White',
  NAVY: 'Navy',
  GREY: 'Grey',
  RED: 'Red',
  BLUE: 'Blue',
} as const;

// Sizes available for clothing
export const CLOTHING_SIZES = {
  XS: 'XS',
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
  XXL: 'XXL',
} as const;

// Helper function to generate product title
export function generateProductTitle(clothing: string, style: string): string {
  return `Custom ${clothing.charAt(0).toUpperCase() + clothing.slice(1)} - ${style} Style`;
}

// Helper function to generate product handle (URL-friendly)
export function generateProductHandle(clothing: string, style: string): string {
  return `custom-${clothing}-${style.toLowerCase().replace(/\s+/g, '-')}`;
}

// Helper function to generate variant SKU
export function generateVariantSku(clothing: string, style: string, color: string, size: string): string {
  return `PIXELME-${clothing.toUpperCase()}-${style.toUpperCase().replace(/\s+/g, '')}-${color.toUpperCase()}-${size}`;
}

// Base product data for PixelMe items
export const BASE_PRODUCT_DATA = {
  product_type: 'Custom Clothing',
  vendor: 'PixelMe',
  tags: ['custom', 'cartoon', 'personalized'],
  status: 'active' as const,
  published: true,
}; 