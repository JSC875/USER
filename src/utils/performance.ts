import React from 'react';
import { Platform } from 'react-native';

// Performance optimization utilities

/**
 * Memoize components for better performance
 * Only re-renders when props actually change
 */
export const memoizeComponent = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
) => {
  return React.memo(Component, propsAreEqual);
};

/**
 * Debounce function calls to improve performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function calls to improve performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Check if device is low-end for performance optimizations
 */
export const isLowEndDevice = (): boolean => {
  // Simple heuristic - can be enhanced with device-specific checks
  return Platform.OS === 'android' && Platform.Version < 26; // Android 8.0
};

/**
 * Performance monitoring utility
 */
export const measurePerformance = <T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T => {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    if (__DEV__) {
      console.log(`⏱️ ${name} took ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  }) as T;
};

/**
 * Lazy load components for better initial load performance
 */
export const lazyLoad = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};

/**
 * Optimize list rendering with proper keys
 */
export const optimizeListKey = (item: any, index: number, prefix?: string): string => {
  if (item?.id) return `${prefix || 'item'}_${item.id}`;
  if (item?.key) return `${prefix || 'item'}_${item.key}`;
  return `${prefix || 'item'}_${index}`;
};

/**
 * Check if component should re-render based on prop changes
 */
export const shouldComponentUpdate = <P extends object>(
  prevProps: P,
  nextProps: P,
  keysToCompare: (keyof P)[]
): boolean => {
  return keysToCompare.some(key => prevProps[key] !== nextProps[key]);
};

/**
 * Memory usage monitoring (development only)
 */
export const logMemoryUsage = (context: string = 'Memory Usage') => {
  if (__DEV__ && Platform.OS === 'android') {
    // Android-specific memory monitoring
    const used = process.memoryUsage();
    console.log(`🧠 ${context}:`, {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
    });
  }
};

/**
 * Optimize image loading
 */
export const optimizeImageUrl = (url: string, width: number, height: number): string => {
  // Add image optimization parameters if supported by your CDN
  if (url.includes('?')) {
    return `${url}&w=${width}&h=${height}&q=80`;
  }
  return `${url}?w=${width}&h=${height}&q=80`;
};

/**
 * Batch state updates for better performance
 */
export const batchStateUpdates = <T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  updates: Partial<T>[]
) => {
  React.startTransition(() => {
    updates.forEach(update => {
      setState(prev => ({ ...prev, ...update }));
    });
  });
};

/**
 * Optimize scroll performance
 */
export const optimizeScrollConfig = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
  removeClippedSubviews: true,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  initialNumToRender: 5,
  getItemLayout: undefined, // Implement if you know item heights
  keyExtractor: (item: any, index: number) => optimizeListKey(item, index),
};

/**
 * Performance constants
 */
export const PERFORMANCE_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  ANIMATION_DURATION: 300,
  LAZY_LOAD_DELAY: 100,
  MEMORY_CHECK_INTERVAL: 30000, // 30 seconds
} as const; 