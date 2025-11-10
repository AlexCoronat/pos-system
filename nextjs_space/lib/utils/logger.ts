/**
 * Application logger utility
 * Provides consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level === 'debug') {
      return
    }

    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    const logFn = console[level] || console.log

    if (context) {
      logFn(prefix, message, context)
    } else {
      logFn(prefix, message)
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }
}

export const logger = new Logger()
