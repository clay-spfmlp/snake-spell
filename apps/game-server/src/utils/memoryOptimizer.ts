/**
 * Memory Optimizer Utility
 * 
 * This utility helps monitor and optimize memory usage in the game server.
 * It provides functions to monitor memory, clear unused objects, and prevent memory leaks.
 */

// Memory usage thresholds
const WARNING_THRESHOLD = 0.7; // 70%
const CRITICAL_THRESHOLD = 0.85; // 85%

// Configure how often optimization runs (in ms)
const MONITOR_INTERVAL = 60000; // 1 minute
const OPTIMIZE_INTERVAL = 300000; // 5 minutes

/**
 * Gets the current memory usage
 */
export function getMemoryUsage() {
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / (1024 * 1024));
  const totalMB = Math.round(memUsage.heapTotal / (1024 * 1024));
  const percentage = (memUsage.heapUsed / memUsage.heapTotal * 100).toFixed(2);
  
  return {
    used: usedMB,
    total: totalMB,
    percentage,
    raw: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      external: memUsage.external
    }
  };
}

/**
 * Attempts to run garbage collection if possible
 */
export function runGarbageCollection() {
  // Check if Node was started with --expose-gc flag
  if (global.gc) {
    try {
      global.gc();
      return true;
    } catch (e) {
      console.error('Failed to run garbage collection:', e);
    }
  }
  return false;
}

/**
 * Creates a memory-optimized version of an object by removing unnecessary properties
 * @param obj The object to optimize
 */
export function optimizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  // For arrays, optimize each element
  if (Array.isArray(obj)) {
    return obj.map(item => optimizeObject(item)) as unknown as T;
  }

  // For regular objects, create a shallow copy without unnecessary properties
  const result = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    // Skip functions, null, undefined, and properties starting with _
    if (
      value === null || 
      value === undefined || 
      typeof value === 'function' || 
      key.startsWith('_')
    ) {
      continue;
    }
    
    // Handle nested objects
    if (typeof value === 'object') {
      (result as any)[key] = optimizeObject(value);
    } else {
      (result as any)[key] = value;
    }
  }
  
  return result;
}

/**
 * Monitor memory usage and log warnings
 */
export function startMemoryMonitor() {
  return setInterval(() => {
    const memory = getMemoryUsage();
    const usageRatio = Number(memory.percentage) / 100;
    
    if (usageRatio >= CRITICAL_THRESHOLD) {
      console.warn(`CRITICAL memory usage: ${memory.percentage}% (${memory.used}MB / ${memory.total}MB)`);
      runGarbageCollection();
    } else if (usageRatio >= WARNING_THRESHOLD) {
      console.warn(`High memory usage: ${memory.percentage}% (${memory.used}MB / ${memory.total}MB)`);
    }
  }, MONITOR_INTERVAL);
}

/**
 * Run periodic optimizations to prevent memory leaks
 * @param callback A function to run during optimization
 */
export function startPeriodicOptimization(callback?: () => void) {
  return setInterval(() => {
    // Run garbage collection
    runGarbageCollection();
    
    // Run custom optimization logic if provided
    if (callback) callback();
    
  }, OPTIMIZE_INTERVAL);
}

/**
 * Memory optimizer class that can be attached to a specific component
 */
export class ComponentMemoryOptimizer {
  private monitorInterval?: NodeJS.Timeout;
  private optimizeInterval?: NodeJS.Timeout;
  private componentName: string;
  private optimizationCallback?: () => void;
  
  constructor(componentName: string, optimizationCallback?: () => void) {
    this.componentName = componentName;
    this.optimizationCallback = optimizationCallback;
  }
  
  public start() {
    this.monitorInterval = startMemoryMonitor();
    this.optimizeInterval = startPeriodicOptimization(() => {
      console.log(`Running optimization for ${this.componentName}`);
      if (this.optimizationCallback) {
        this.optimizationCallback();
      }
    });
    
    return this;
  }
  
  public stop() {
    if (this.monitorInterval) clearInterval(this.monitorInterval);
    if (this.optimizeInterval) clearInterval(this.optimizeInterval);
    
    return this;
  }
} 