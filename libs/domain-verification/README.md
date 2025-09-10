# @do-mails/domain-verification

Domain verification library with DNS checking for the do-Mails system.

## Features

- **DNS Verification**: Verify domain ownership using TXT records
- **Domain Validation**: Comprehensive domain name format validation
- **DNS Queries**: Query various DNS record types (A, MX, TXT, etc.)
- **Health Checks**: Comprehensive domain health and accessibility checks
- **Token Generation**: Secure verification token generation
- **CLI Interface**: Command-line tools for domain operations
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
npm install @do-mails/domain-verification
```

## Usage

### Library Usage

```typescript
import { DomainVerification } from '@do-mails/domain-verification'

const verifier = new DomainVerification({
  defaultTimeout: 10000,
  defaultRetries: 3,
  recordPrefix: '_domails-verify',
  dnsServers: ['8.8.8.8', '1.1.1.1']
})

// Generate verification token
const token = verifier.generateToken({ length: 32 })

// Get verification instructions
const instructions = verifier.getInstructions('example.com', token)

// Verify domain ownership
const result = await verifier.verifyDomain('example.com', token)

// Validate domain format
const validation = verifier.validateDomain('example.com')

// Perform health check
const health = await verifier.healthCheck('example.com')
```

### CLI Usage

```bash
# Verify domain ownership
domain-verification verify-domain \
  --domain example.com \
  --token your-verification-token

# Check DNS records
domain-verification check-dns \
  --domain example.com \
  --type MX

# Validate domain format
domain-verification validate-domain --domain example.com

# Generate verification token
domain-verification generate-token --length 64

# Perform health check
domain-verification health-check --domain example.com
```

## Configuration

### Configuration File

```json
{
  "defaultTimeout": 10000,
  "defaultRetries": 3,
  "recordPrefix": "_domails-verify",
  "dnsServers": ["8.8.8.8", "1.1.1.1"],
  "allowedDomains": ["example.com", "test.org"],
  "blockedDomains": ["localhost", "invalid"],
  "cacheTimeout": 300000
}
```

## API Reference

### DomainVerification

Main class that provides all domain verification functionality.

#### Methods

- `verifyDomain(domain: string, token: string): Promise<DomainVerificationResult>`
- `validateDomain(domain: string): DomainValidationResult`
- `generateToken(options?: TokenGenerationOptions): string`
- `getInstructions(domain: string, token: string): VerificationInstructions`
- `healthCheck(domain: string): Promise<DomainHealthCheck>`
- `queryDNS(domain: string, recordType: DNSRecordType): Promise<DNSQueryResult>`

### DomainVerifier

Core domain verification functionality.

#### Methods

- `verifyDomain(request: DomainVerificationRequest): Promise<DomainVerificationResult>`
- `generateVerificationToken(options?: TokenGenerationOptions): string`
- `getVerificationInstructions(domain: string, token: string): VerificationInstructions`
- `performHealthCheck(domain: string): Promise<DomainHealthCheck>`

### DomainValidator

Domain name format validation.

#### Methods

- `validateDomain(domain: string): DomainValidationResult`
- `isSubdomain(domain: string): boolean`
- `getRootDomain(domain: string): string`
- `generateSuggestions(domain: string): string[]`
- `normalizeDomain(domain: string): string`

### DNSService

DNS query functionality.

#### Methods

- `queryRecords(domain: string, recordType: DNSRecordType): Promise<DNSQueryResult>`
- `queryTXTRecords(domain: string): Promise<string[]>`
- `queryMXRecords(domain: string): Promise<string[]>`
- `queryARecords(domain: string): Promise<string[]>`
- `domainExists(domain: string): Promise<boolean>`

## Types

### DomainVerificationResult

```typescript
interface DomainVerificationResult {
  domain: string
  verified: boolean
  token: string
  recordName: string
  recordValue?: string
  error?: string
  timestamp: Date
  dnsRecords: string[]
  verificationTime?: number
}
```

### DomainValidationResult

```typescript
interface DomainValidationResult {
  domain: string
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}
```

### DomainHealthCheck

```typescript
interface DomainHealthCheck {
  domain: string
  accessible: boolean
  responseTime?: number
  httpStatus?: number
  httpsSupported: boolean
  certificateValid?: boolean
  mxRecords: string[]
  txtRecords: string[]
  errors: string[]
  timestamp: Date
}
```

## Verification Process

1. **Generate Token**: Create a unique verification token
2. **DNS Setup**: Add TXT record to domain's DNS
3. **Verification**: Query DNS to confirm token presence
4. **Validation**: Confirm domain ownership

### DNS Record Format

```
Name: _domails-verify.yourdomain.com
Type: TXT
Value: your-verification-token
TTL: 300
```

## Error Handling

The library provides specific error types:

- `DomainVerificationError`: Base error class
- `DNSError`: DNS query related errors
- `ValidationError`: Domain validation errors
- `TimeoutError`: Operation timeout errors

## Security Features

- Secure token generation with multiple character sets
- DNS query timeout and retry mechanisms
- Domain validation against reserved/blocked lists
- Cache management for verification results

## Testing

```bash
npm test
```

## License

MIT
