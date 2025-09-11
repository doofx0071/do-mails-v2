import { NextRequest } from 'next/server'

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// Structured log entry interface
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  requestId?: string
  userId?: string
  method?: string
  path?: string
  statusCode?: number
  duration?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
}

// Logger configuration
interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableStructured: boolean
  includeStack: boolean
}

class Logger {
  private config: LoggerConfig
  private static instance: Logger

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStructured: process.env.NODE_ENV === 'production',
      includeStack: process.env.NODE_ENV === 'development',
      ...config
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    const currentLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)
    return messageLevelIndex >= currentLevelIndex
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.config.enableStructured) {
      return JSON.stringify(entry)
    }

    // Human-readable format for development
    const timestamp = entry.timestamp
    const level = entry.level.toUpperCase().padEnd(5)
    const requestInfo = entry.requestId ? `[${entry.requestId}]` : ''
    const userInfo = entry.userId ? `[user:${entry.userId}]` : ''
    const methodPath = entry.method && entry.path ? `${entry.method} ${entry.path}` : ''
    const duration = entry.duration ? `(${entry.duration}ms)` : ''
    
    let message = `${timestamp} ${level} ${requestInfo}${userInfo} ${methodPath} ${entry.message} ${duration}`.trim()
    
    if (entry.error && this.config.includeStack) {
      message += `\n${entry.error.stack}`
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}`
    }
    
    return message
  }

  private log(level: LogLevel, message: string, context: Partial<LogEntry> = {}): void {
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context
    }

    const formattedMessage = this.formatLogEntry(entry)

    if (this.config.enableConsole) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage)
          break
        case LogLevel.INFO:
          console.info(formattedMessage)
          break
        case LogLevel.WARN:
          console.warn(formattedMessage)
          break
        case LogLevel.ERROR:
          console.error(formattedMessage)
          break
      }
    }

    // In production, you might want to send logs to external services
    // like DataDog, LogRocket, or CloudWatch
    if (this.config.enableStructured && process.env.NODE_ENV === 'production') {
      // Example: Send to external logging service
      // await sendToLoggingService(entry)
    }
  }

  debug(message: string, context?: Partial<LogEntry>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Partial<LogEntry>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Partial<LogEntry>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Partial<LogEntry>): void {
    const errorContext = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : {}

    this.log(LogLevel.ERROR, message, { ...errorContext, ...context })
  }
}

// Request ID generation
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Extract request ID from headers or generate new one
export function getRequestId(request: NextRequest): string {
  const existingId = request.headers.get('x-request-id')
  if (existingId) {
    return existingId
  }
  return generateRequestId()
}

// Extract user ID from request (assuming JWT token)
export function getUserId(request: NextRequest): string | undefined {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return undefined
    }

    const token = authHeader.substring(7)
    // In a real implementation, you'd decode the JWT
    // For now, we'll extract from a mock structure
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.sub || payload.user_id
  } catch {
    return undefined
  }
}

// Request context for logging
export interface RequestContext {
  requestId: string
  userId?: string
  method: string
  path: string
  userAgent?: string
  ip?: string
}

// Create request context from NextRequest
export function createRequestContext(request: NextRequest): RequestContext {
  const url = new URL(request.url)
  
  return {
    requestId: getRequestId(request),
    userId: getUserId(request),
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get('user-agent') || undefined,
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown'
  }
}

// API route logger with request context
export class APILogger {
  private logger: Logger
  private context: RequestContext

  constructor(request: NextRequest) {
    this.logger = Logger.getInstance()
    this.context = createRequestContext(request)
  }

  private getLogContext(additionalContext?: Record<string, any>): Partial<LogEntry> {
    return {
      requestId: this.context.requestId,
      userId: this.context.userId,
      method: this.context.method,
      path: this.context.path,
      metadata: {
        userAgent: this.context.userAgent,
        ip: this.context.ip,
        ...additionalContext
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.logger.debug(message, this.getLogContext(context))
  }

  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, this.getLogContext(context))
  }

  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, this.getLogContext(context))
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.error(message, error, this.getLogContext(context))
  }

  // Log request start
  logRequestStart(): void {
    this.info('Request started')
  }

  // Log request completion
  logRequestEnd(statusCode: number, duration: number): void {
    this.info('Request completed', {
      statusCode,
      duration,
      success: statusCode < 400
    })
  }

  // Log database operations
  logDatabaseOperation(operation: string, table: string, duration?: number): void {
    this.debug(`Database ${operation}`, {
      operation,
      table,
      duration
    })
  }

  // Log external API calls
  logExternalAPI(service: string, endpoint: string, duration?: number, success?: boolean): void {
    this.info(`External API call to ${service}`, {
      service,
      endpoint,
      duration,
      success
    })
  }

  // Log authentication events
  logAuth(event: string, success: boolean, reason?: string): void {
    this.info(`Authentication ${event}`, {
      event,
      success,
      reason
    })
  }

  // Get request ID for response headers
  getRequestId(): string {
    return this.context.requestId
  }
}

// Singleton logger instance
export const logger = Logger.getInstance()

// Helper function to create API logger
export function createAPILogger(request: NextRequest): APILogger {
  return new APILogger(request)
}

// Performance timing helper
export class PerformanceTimer {
  private startTime: number
  private logger: APILogger

  constructor(logger: APILogger) {
    this.startTime = Date.now()
    this.logger = logger
  }

  end(operation: string): number {
    const duration = Date.now() - this.startTime
    this.logger.debug(`${operation} completed`, { duration })
    return duration
  }
}

// Create performance timer
export function createTimer(logger: APILogger): PerformanceTimer {
  return new PerformanceTimer(logger)
}

// API route wrapper with automatic logging
export function withLogging<T extends any[]>(
  handler: (request: NextRequest, logger: APILogger, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const logger = createAPILogger(request)
    const timer = createTimer(logger)

    logger.logRequestStart()

    try {
      const response = await handler(request, logger, ...args)
      const duration = timer.end('Request processing')

      logger.logRequestEnd(response.status, duration)

      // Add request ID to response headers
      response.headers.set('x-request-id', logger.getRequestId())

      return response
    } catch (error) {
      const duration = timer.end('Request processing (error)')

      logger.error('Request failed', error as Error)
      logger.logRequestEnd(500, duration)

      // Return error response with request ID
      const errorResponse = new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': logger.getRequestId()
          }
        }
      )

      return errorResponse
    }
  }
}
