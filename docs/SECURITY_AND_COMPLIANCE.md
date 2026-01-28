# Security and Compliance

Security requirements, best practices, and compliance considerations.

## Table of Contents

- [Authentication & Authorization](#authentication--authorization)
- [Input Validation](#input-validation)
- [Data Protection](#data-protection)
- [API Security](#api-security)
- [Store Scraping Compliance](#store-scraping-compliance)
- [Secrets Management](#secrets-management)
- [Audit Logging](#audit-logging)

---

## Authentication & Authorization

### Authentication

**Current (MVP):** None (UI-only)

**Production Requirements:**

1. **User Authentication**
   - Email/password login
   - JWT tokens (access + refresh)
   - Token expiration (15 min access, 7 days refresh)
   - Password requirements:
     - Minimum 8 characters
     - At least one uppercase, lowercase, number
     - No common passwords

2. **Session Management**
   - Secure HTTP-only cookies for refresh tokens
   - Token rotation on refresh
   - Logout invalidates tokens
   - Session timeout after inactivity

3. **Multi-Factor Authentication (Future)**
   - Optional 2FA for admin users
   - TOTP or SMS-based

### Authorization (RBAC)

**Roles:**

1. **Admin**
   - Full access to all features
   - User management
   - System configuration
   - Import job management

2. **Reviewer**
   - View and edit products
   - Save drafts
   - Mark as ready
   - Push products
   - Cannot manage users or system settings

**Permission Matrix:**

| Action | Admin | Reviewer |
|--------|-------|----------|
| View products | ✅ | ✅ |
| Edit products | ✅ | ✅ |
| Save drafts | ✅ | ✅ |
| Push products | ✅ | ✅ |
| Delete products | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| Trigger imports | ✅ | ❌ |
| System config | ✅ | ❌ |

**Implementation:**
- Middleware checks user role
- API endpoints enforce permissions
- UI shows/hides features based on role

---

## Input Validation

### Client-Side Validation

**Current Implementation:**
- React form validation
- Inline error messages
- Disabled buttons when invalid

**File:** `lib/store.ts` - `validateProduct()`

### Server-Side Validation (Production)

**Required for all inputs:**

1. **Product Fields**
   - `nameMn`: Non-empty string, max 500 chars
   - `descriptionMn`: Non-empty string, max 5000 chars
   - `priceMnt`: Positive integer, max 10^9
   - `imagesFinal`: Array of valid URLs, max 10 items

2. **URL Validation**
   - Validate image URLs format
   - Whitelist allowed domains
   - Reject malicious URLs (javascript:, data:, etc.)

3. **SQL Injection Prevention**
   - Use parameterized queries
   - ORM with built-in protection
   - No string concatenation in SQL

4. **XSS Prevention**
   - Sanitize all user inputs
   - Use React's built-in escaping
   - No `dangerouslySetInnerHTML` (already verified: none in codebase)

**Example Validation:**
```typescript
function validateImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const allowedDomains = ['s3.amazonaws.com', 'cdn.example.com']
    return allowedDomains.includes(parsed.hostname) &&
           ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
```

---

## Data Protection

### Encryption

1. **Data at Rest**
   - Database encryption (PostgreSQL TDE)
   - S3 bucket encryption (AES-256)
   - Backup encryption

2. **Data in Transit**
   - HTTPS/TLS 1.3 for all connections
   - API endpoints require HTTPS
   - Database connections encrypted

3. **Sensitive Data**
   - Passwords: bcrypt hashing (cost factor 12)
   - API keys: Encrypted in database
   - Tokens: Signed with secret key

### PII Handling

**Personal Data:**
- User emails (hashed in logs)
- User activity logs (anonymized after 90 days)

**Compliance:**
- GDPR compliance (if EU users)
- Data retention policies

---

## API Security

### Authentication

**All endpoints require JWT token:**
```
Authorization: Bearer <token>
```

### Rate Limiting

**Limits:**
- 100 requests/minute per user
- 1000 requests/hour per user
- 10,000 requests/day per user

**Implementation:**
- Redis-based rate limiting
- Sliding window algorithm
- Return 429 with Retry-After header

### CORS

**Configuration:**
- Whitelist allowed origins
- No wildcard origins
- Credentials: true (for cookies)

### Input Sanitization

- Validate all inputs
- Reject malformed data
- Limit payload size (max 10MB)

### Error Handling

**Don't expose:**
- Stack traces
- Database errors
- Internal paths

**Return generic errors:**
```json
{
  "error": "An error occurred",
  "code": "INTERNAL_ERROR"
}
```

---

## Store Scraping Compliance

### Legal Considerations

**Important:** Web scraping has legal implications. Consult legal counsel.

**Best Practices:**

1. **Respect robots.txt**
   - Check robots.txt before scraping
   - Honor crawl-delay directives
   - Don't scrape disallowed paths

2. **Rate Limiting**
   - Implement delays between requests
   - Don't overload servers
   - Use reasonable request rates

3. **Terms of Service**
   - Review store ToS
   - Comply with terms
   - Consider API access if available

4. **Data Usage**
   - Use data only for stated purpose
   - Don't resell scraped data
   - Respect copyright on images

5. **User Agent**
   - Identify your scraper
   - Provide contact information
   - Follow ethical scraping practices

**Implementation:**
```python
# Example: Check robots.txt
from urllib.robotparser import RobotFileParser

rp = RobotFileParser()
rp.set_url('https://store.com/robots.txt')
rp.read()
if rp.can_fetch('*', url):
    # Proceed with scraping
```

### Compliance Checklist

- [ ] Legal review completed
- [ ] robots.txt checked
- [ ] Rate limiting implemented
- [ ] ToS reviewed
- [ ] User agent configured
- [ ] Contact information provided
- [ ] Data usage policy defined

---

## Secrets Management

### Current (MVP)

**No secrets** (UI-only, no backend)

### Production Requirements

1. **Environment Variables**
   - Never commit secrets to git
   - Use `.env` files (gitignored)
   - Use secret management service (AWS Secrets Manager, HashiCorp Vault)

2. **Database Credentials**
   - Store in secret manager
   - Rotate regularly (90 days)
   - Use connection pooling with credentials

3. **API Keys**
   - Translation API keys
   - Currency API keys
   - S3 access keys
   - Store encrypted in database or secret manager

4. **JWT Secrets**
   - Strong random secret (256 bits)
   - Rotate periodically
   - Different secrets for dev/staging/prod

**Example (AWS Secrets Manager):**
```typescript
import { SecretsManager } from 'aws-sdk'

const secrets = new SecretsManager()
const dbPassword = await secrets.getSecretValue({
  SecretId: 'prod/database/password'
}).promise()
```

---

## Audit Logging

### What to Log

1. **User Actions**
   - Login/logout
   - Product edits
   - Status changes
   - Bulk operations
   - Visibility toggles

2. **System Events**
   - Import job creation/completion
   - Translation job completion
   - Source check results
   - Error occurrences

3. **Security Events**
   - Failed login attempts
   - Unauthorized access attempts
   - Token refresh
   - Permission denied

### Log Format

```json
{
  "timestamp": "2024-01-20T10:30:00.000Z",
  "userId": "uuid",
  "action": "product:update",
  "resourceId": "gmarket-skincare-0",
  "changes": {
    "status": "PUSHED"
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Storage

- **Retention:** 90 days (hot), 1 year (cold)
- **Storage:** CloudWatch, Datadog, or ELK stack
- **Access:** Admin only, encrypted at rest

### Compliance

- **GDPR:** Anonymize PII after retention period
- **SOC 2:** Maintain audit trail
- **PCI DSS:** If handling payments (not applicable here)

---

## Security Checklist

### Authentication
- [ ] JWT tokens implemented
- [ ] Token expiration configured
- [ ] Refresh token rotation
- [ ] Password requirements enforced

### Authorization
- [ ] RBAC implemented
- [ ] Permissions checked on all endpoints
- [ ] UI reflects user permissions

### Input Validation
- [ ] All inputs validated server-side
- [ ] URL validation implemented
- [ ] SQL injection prevention
- [ ] XSS prevention

### Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Passwords hashed (bcrypt)
- [ ] Secrets in secret manager

### API Security
- [ ] Rate limiting implemented
- [ ] CORS configured
- [ ] Error handling secure
- [ ] HTTPS enforced

### Compliance
- [ ] Legal review completed
- [ ] robots.txt checked
- [ ] Audit logging implemented
- [ ] Data retention policy defined

---

## Security Incident Response

### Incident Types

1. **Data Breach**
   - Notify affected users
   - Reset compromised credentials
   - Investigate and patch vulnerability

2. **Unauthorized Access**
   - Revoke compromised tokens
   - Review audit logs
   - Strengthen authentication

3. **DDoS Attack**
   - Enable rate limiting
   - Use CDN/WAF
   - Scale infrastructure

### Response Plan

1. **Detection**
   - Monitoring alerts
   - Anomaly detection
   - User reports

2. **Containment**
   - Isolate affected systems
   - Revoke access
   - Preserve evidence

3. **Investigation**
   - Review logs
   - Identify root cause
   - Assess impact

4. **Recovery**
   - Patch vulnerability
   - Restore services
   - Verify security

5. **Post-Incident**
   - Document incident
   - Update security measures
   - Communicate to stakeholders

---

## File Reference

- Current Validation: `lib/store.ts` - `validateProduct()`
- Types: `types/product.ts`

