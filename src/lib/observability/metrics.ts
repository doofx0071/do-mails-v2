import { NextRequest } from 'next/server'

// Metrics collection interface
export interface Metric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

// Request metrics
export interface RequestMetrics {
  path: string
  method: string
  statusCode: number
  duration: number
  timestamp: number
  userId?: string
  userAgent?: string
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// Rate limit store interface
interface RateLimitStore {
  get(key: string): Promise<number | null>
  set(key: string, value: number, ttlMs: number): Promise<void>
  increment(key: string, ttlMs: number): Promise<number>
}

// In-memory rate limit store (for development/single instance)
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { value: number; expires: number }>()

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key)
    if (!entry || entry.expires < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: number, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expires: Date.now() + ttlMs
    })
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const current = await this.get(key)
    const newValue = (current || 0) + 1
    await this.set(key, newValue, ttlMs)
    return newValue
  }
}

// Metrics collector
class MetricsCollector {
  private metrics: Metric[] = []
  private requestMetrics: RequestMetrics[] = []
  private static instance: MetricsCollector

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  // Record a custom metric
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      tags
    })

    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  // Record request metrics
  recordRequest(metrics: RequestMetrics): void {
    this.requestMetrics.push(metrics)

    // Keep only last 1000 request metrics in memory
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000)
    }

    // Record derived metrics
    this.recordMetric('http_requests_total', 1, {
      method: metrics.method,
      path: metrics.path,
      status_code: metrics.statusCode.toString()
    })

    this.recordMetric('http_request_duration_ms', metrics.duration, {
      method: metrics.method,
      path: metrics.path
    })
  }

  // Get metrics summary
  getMetricsSummary(): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    requestsByPath: Record<string, number>
    requestsByStatus: Record<string, number>
  } {
    const recentRequests = this.requestMetrics.filter(
      m => m.timestamp > Date.now() - 60000 // Last minute
    )

    const totalRequests = recentRequests.length
    const averageResponseTime = totalRequests > 0
      ? recentRequests.reduce((sum, m) => sum + m.duration, 0) / totalRequests
      : 0

    const errorRequests = recentRequests.filter(m => m.statusCode >= 400).length
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0

    const requestsByPath = recentRequests.reduce((acc, m) => {
      acc[m.path] = (acc[m.path] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const requestsByStatus = recentRequests.reduce((acc, m) => {
      const status = Math.floor(m.statusCode / 100) * 100
      const statusRange = `${status}xx`
      acc[statusRange] = (acc[statusRange] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRequests,
      averageResponseTime,
      errorRate,
      requestsByPath,
      requestsByStatus
    }
  }

  // Export metrics for external monitoring systems
  exportMetrics(): {
    metrics: Metric[]
    requests: RequestMetrics[]
    summary: ReturnType<MetricsCollector['getMetricsSummary']>
  } {
    return {
      metrics: [...this.metrics],
      requests: [...this.requestMetrics],
      summary: this.getMetricsSummary()
    }
  }
}

// Rate limiter
class RateLimiter {
  private store: RateLimitStore
  private config: RateLimitConfig

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = config
    this.store = store || new MemoryRateLimitStore()
  }

  private generateKey(request: NextRequest): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(request)
    }

    // Default: use IP address
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'
    
    return `rate_limit:${ip}`
  }

  async checkLimit(request: NextRequest): Promise<{
    allowed: boolean
    remaining: number
    resetTime: number
    total: number
  }> {
    const key = this.generateKey(request)
    const current = await this.store.increment(key, this.config.windowMs)
    
    const allowed = current <= this.config.maxRequests
    const remaining = Math.max(0, this.config.maxRequests - current)
    const resetTime = Date.now() + this.config.windowMs

    return {
      allowed,
      remaining,
      resetTime,
      total: this.config.maxRequests
    }
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per 15 minutes
  },
  
  // Domain verification - moderate limits
  DOMAIN_VERIFICATION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 verifications per minute
  },
  
  // Email sending - strict limits
  EMAIL_SEND: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // 20 emails per minute
  },
  
  // General API - generous limits
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 requests per minute
  }
}

// Singleton instances
export const metricsCollector = MetricsCollector.getInstance()

// Rate limiter factory
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config)
}

// Middleware for request timing and metrics
export function withMetrics<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const startTime = Date.now()
    const url = new URL(request.url)
    
    try {
      const response = await handler(request, ...args)
      const duration = Date.now() - startTime
      
      // Record request metrics
      metricsCollector.recordRequest({
        path: url.pathname,
        method: request.method,
        statusCode: response.status,
        duration,
        timestamp: startTime,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      // Add timing headers
      response.headers.set('x-response-time', `${duration}ms`)
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Record error metrics
      metricsCollector.recordRequest({
        path: url.pathname,
        method: request.method,
        statusCode: 500,
        duration,
        timestamp: startTime,
        userAgent: request.headers.get('user-agent') || undefined
      })
      
      throw error
    }
  }
}

// Middleware for rate limiting
export function withRateLimit(config: RateLimitConfig) {
  const rateLimiter = createRateLimiter(config)
  
  return function<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<Response> => {
      const limitResult = await rateLimiter.checkLimit(request)
      
      if (!limitResult.allowed) {
        const response = new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Try again in ${Math.ceil((limitResult.resetTime - Date.now()) / 1000)} seconds.`
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limitResult.total.toString(),
              'X-RateLimit-Remaining': limitResult.remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(limitResult.resetTime / 1000).toString(),
              'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString()
            }
          }
        )
        
        // Record rate limit hit
        metricsCollector.recordMetric('rate_limit_exceeded', 1, {
          path: new URL(request.url).pathname,
          method: request.method
        })
        
        return response
      }
      
      const response = await handler(request, ...args)
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limitResult.total.toString())
      response.headers.set('X-RateLimit-Remaining', limitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(limitResult.resetTime / 1000).toString())
      
      return response
    }
  }
}

// Combined middleware for metrics and rate limiting
export function withObservability(rateLimitConfig?: RateLimitConfig) {
  return function<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<Response>
  ) {
    let wrappedHandler = withMetrics(handler)
    
    if (rateLimitConfig) {
      wrappedHandler = withRateLimit(rateLimitConfig)(wrappedHandler)
    }
    
    return wrappedHandler
  }
}
