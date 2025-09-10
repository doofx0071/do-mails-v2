# @do-mails/alias-management

Email alias management library with validation for the do-Mails system.

## Features

- **Alias Creation**: Create and manage email aliases with validation
- **Validation**: Comprehensive alias name format and rule validation
- **Generation**: Generate random, readable, or pattern-based alias names
- **Availability**: Check alias availability and get suggestions
- **Statistics**: Track alias usage and performance metrics
- **Search & Filter**: Advanced alias search and filtering capabilities
- **CLI Interface**: Command-line tools for alias operations
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
npm install @do-mails/alias-management
```

## Usage

### Library Usage

```typescript
import { AliasManagement } from '@do-mails/alias-management'

const manager = new AliasManagement({
  maxAliasesPerDomain: 1000,
  maxAliasLength: 64,
  enableProfanityFilter: true,
  reservedAliases: ['admin', 'support', 'info']
})

// Create alias
const alias = await manager.createAlias('domain-id', 'myalias', true)

// Validate alias
const validation = manager.validateAlias('test-alias')

// Generate aliases
const suggestions = manager.generateAliases({
  count: 5,
  pattern: 'readable',
  length: 8
})

// Check availability
const availability = await manager.checkAvailability('myalias', 'example.com')

// Search aliases
const results = await manager.searchAliases({
  domainId: 'domain-id',
  isEnabled: true,
  query: 'test'
})
```

### CLI Usage

```bash
# Create alias
alias-management create-alias \
  --domain-id abc123 \
  --alias myalias \
  --enabled

# List aliases
alias-management list-aliases \
  --domain-id abc123 \
  --enabled \
  --limit 10

# Validate alias
alias-management validate-alias --alias test-alias

# Generate aliases
alias-management generate-alias \
  --count 5 \
  --pattern readable \
  --length 10

# Check availability
alias-management check-availability \
  --alias myalias \
  --domain example.com

# Get statistics
alias-management stats --domain-id abc123
```

## Configuration

### Configuration File

```json
{
  "maxAliasesPerDomain": 1000,
  "maxAliasLength": 64,
  "minAliasLength": 1,
  "allowedCharacters": "abcdefghijklmnopqrstuvwxyz0123456789._-",
  "reservedAliases": [
    "admin", "administrator", "root", "postmaster", "webmaster",
    "support", "help", "info", "contact", "sales"
  ],
  "blockedPatterns": [
    "test", "temp", "temporary", "spam"
  ],
  "enableProfanityFilter": true,
  "enableSimilarityCheck": true,
  "similarityThreshold": 0.8
}
```

## API Reference

### AliasManagement

Main class that provides all alias management functionality.

#### Methods

- `createAlias(domainId: string, aliasName: string, isEnabled?: boolean): Promise<EmailAlias>`
- `updateAlias(aliasId: string, updates: UpdateAliasRequest): Promise<EmailAlias>`
- `deleteAlias(aliasId: string): Promise<void>`
- `getAlias(aliasId: string): Promise<EmailAlias>`
- `searchAliases(options?: AliasSearchOptions): Promise<AliasSearchResult>`
- `validateAlias(aliasName: string): AliasValidationResult`
- `generateAliases(options?: AliasGenerationOptions): string[]`
- `checkAvailability(aliasName: string, domainName: string): Promise<AliasAvailabilityResult>`
- `getStats(domainId?: string): Promise<AliasStats>`

### AliasValidator

Alias name validation functionality.

#### Methods

- `validateAlias(aliasName: string): AliasValidationResult`
- `checkAvailability(aliasName: string, domainName: string, existingAliases?: string[]): Promise<AliasAvailabilityResult>`
- `findSimilarAliases(aliasName: string, existingAliases: string[]): string[]`
- `normalizeAlias(aliasName: string): string`
- `generateSuggestions(input: string, existingAliases?: string[]): string[]`

### AliasGenerator

Alias name generation functionality.

#### Methods

- `generateAliases(options?: AliasGenerationOptions): string[]`
- `generateUniqueAliases(count: number, existingAliases: string[], options?: AliasGenerationOptions): string[]`
- `generateSuggestions(baseName: string, existingAliases?: string[]): string[]`
- `generateCustomAlias(pattern: string, replacements?: Record<string, string>): string`

### AliasManager

Core alias management operations.

#### Methods

- `createAlias(request: CreateAliasRequest): Promise<EmailAlias>`
- `updateAlias(aliasId: string, request: UpdateAliasRequest): Promise<EmailAlias>`
- `deleteAlias(aliasId: string): Promise<void>`
- `getAlias(aliasId: string): Promise<EmailAlias>`
- `searchAliases(options?: AliasSearchOptions): Promise<AliasSearchResult>`
- `getAliasStats(domainId?: string): Promise<AliasStats>`
- `bulkUpdateAliases(aliasIds: string[], updates: Partial<UpdateAliasRequest>): Promise<EmailAlias[]>`

## Types

### EmailAlias

```typescript
interface EmailAlias {
  id: string
  domainId: string
  aliasName: string
  fullAddress: string
  isEnabled: boolean
  lastEmailReceivedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### AliasValidationResult

```typescript
interface AliasValidationResult {
  aliasName: string
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}
```

### AliasGenerationOptions

```typescript
interface AliasGenerationOptions {
  length?: number
  includeNumbers?: boolean
  includeSpecialChars?: boolean
  prefix?: string
  suffix?: string
  excludeWords?: string[]
  pattern?: 'random' | 'readable' | 'uuid' | 'timestamp'
  count?: number
}
```

## Validation Rules

### Allowed Characters
- Letters (a-z, A-Z)
- Numbers (0-9)
- Dots (.)
- Underscores (_)
- Hyphens (-)

### Restrictions
- Cannot start or end with dots
- Cannot contain consecutive dots
- Cannot use reserved aliases (admin, support, etc.)
- Cannot contain blocked patterns (spam, temp, etc.)
- Length limits (1-64 characters by default)
- Optional profanity filtering

## Generation Patterns

### Random
Generates completely random aliases using allowed characters.

### Readable
Combines adjectives and nouns for memorable aliases (e.g., "brightocean42").

### UUID
Uses UUID-based generation for guaranteed uniqueness.

### Timestamp
Incorporates timestamp for time-based aliases.

## Error Handling

The library provides specific error types:

- `AliasManagementError`: Base error class
- `ValidationError`: Alias validation errors
- `DuplicateAliasError`: Duplicate alias errors
- `AliasNotFoundError`: Alias not found errors
- `QuotaExceededError`: Quota limit errors

## Testing

```bash
npm test
```

## License

MIT
