import crypto from 'crypto'

/**
 * Validate if a string is a valid UUID v4
 */
export const isUUID = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Generate a verification token for domain verification
 */
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validate UUID and throw error if invalid
 */
export const validateUUID = (value: string, fieldName: string = 'ID'): void => {
  if (!isUUID(value)) {
    throw new Error(`Invalid ${fieldName}: expected UUID format, got '${value}'`)
  }
}

/**
 * Assert that a value is a UUID (TypeScript type guard)
 */
export const assertUUID = (value: string, fieldName?: string): asserts value is string => {
  validateUUID(value, fieldName)
}