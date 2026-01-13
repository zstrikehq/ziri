# API Key Security Approaches

## Current Problem

**Current State:**
- API key format: `sk-zs-{userId}-{hash}`
- Hash is just a random string (not cryptographically validated)
- Anyone who obtains the API key can use it
- No binding to user identity, device, or location
- Backend only extracts `userId` from the key format (not validated)

**Security Risk:**
If someone steals or intercepts an API key, they can impersonate the user and make requests on their behalf.

---

## Security Approaches

### 1. **Cryptographic API Key Validation** ⭐ (Recommended)

**Concept:**
- Store a cryptographic hash (HMAC-SHA256) of the API key on the backend
- When a request comes in, hash the provided key and compare with stored hash
- The API key itself should contain a secret component that's validated

**Implementation:**
```
Key Generation:
1. Generate secret: random 32-byte secret
2. Create key: sk-zs-{userId}-{base64(hmac(userId + timestamp, secret))}
3. Store on backend: hash(apiKey) = HMAC-SHA256(apiKey, server-secret)

Validation:
1. Extract userId from key format
2. Lookup stored hash for that userId
3. Compute hash of provided key
4. Compare hashes - if match, key is valid
```

**Pros:**
- ✅ Keys can be validated cryptographically
- ✅ Keys can't be forged without server secret
- ✅ Backend can verify key authenticity
- ✅ Standard approach (similar to JWT)

**Cons:**
- ❌ Requires backend to store key hashes
- ❌ Need to handle key rotation
- ❌ More complex key generation

**Backend Changes:**
- Store `apiKeyHash` in entity attributes
- Validate hash on every request
- Reject if hash doesn't match

---

### 2. **IP Address Binding** ⭐ (Easy to Implement)

**Concept:**
- Already have `allowed_ip_ranges` in entity attributes
- Enforce IP validation on backend for `/chat/completions` endpoint
- Reject requests from unauthorized IPs

**Implementation:**
```
On Request:
1. Extract userId from API key
2. Load entity with allowed_ip_ranges
3. Get client IP from request (X-Forwarded-For, etc.)
4. Check if client IP is in allowed_ip_ranges
5. If not, reject with 403 Forbidden
```

**Pros:**
- ✅ Already have the data structure
- ✅ Simple to implement
- ✅ Effective for server-to-server or fixed IP scenarios
- ✅ Can be combined with other methods

**Cons:**
- ❌ Not effective for mobile/dynamic IP users
- ❌ VPNs/proxies can bypass
- ❌ Users behind NAT share IPs
- ❌ May need to allow multiple IPs/ranges

**Backend Changes:**
- Extract client IP from request headers
- Validate against `entity.attrs.allowed_ip_ranges`
- Return 403 if IP not allowed

---

### 3. **Request Signing (HMAC)** ⭐⭐ (High Security)

**Concept:**
- API key is public identifier
- Each request must be signed with a secret key
- Backend validates signature before processing

**Implementation:**
```
Key Generation:
1. Generate userId and secretKey pair
2. API Key: sk-zs-{userId}-{publicId}
3. Secret Key: (stored separately, shown once to user)

Request Signing:
1. Create signature: HMAC-SHA256(requestBody + timestamp, secretKey)
2. Send: Authorization: Bearer {apiKey}
3. Send: X-Signature: {signature}
4. Send: X-Timestamp: {timestamp}

Backend Validation:
1. Extract userId from apiKey
2. Lookup secretKey for userId
3. Recreate signature with request body + timestamp
4. Compare signatures - if match, request is authentic
5. Check timestamp (prevent replay attacks)
```

**Pros:**
- ✅ Very secure - keys can't be used without secret
- ✅ Prevents replay attacks (with timestamp)
- ✅ Standard approach (AWS, Stripe use this)
- ✅ Keys can be public, secrets are private

**Cons:**
- ❌ More complex SDK implementation
- ❌ Users must store secret key securely
- ❌ SDK must handle signing logic
- ❌ More complex for end-users

**SDK Changes:**
- Store both API key and secret key
- Sign every request with HMAC
- Include timestamp in signature

---

### 4. **Token-Based with Refresh** ⭐⭐ (Modern Approach)

**Concept:**
- API key is used to obtain short-lived access tokens
- Tokens expire (e.g., 1 hour)
- Tokens are validated on each request
- Refresh tokens for new access tokens

**Implementation:**
```
Flow:
1. User provides API key to SDK
2. SDK calls: POST /oauth2/token (with API key)
3. Backend validates API key, returns access_token + refresh_token
4. SDK uses access_token for requests
5. When token expires, SDK uses refresh_token to get new access_token
6. Access tokens are JWT with userId, expiry, etc.

Backend:
- Store API key hash in entity
- Validate API key on token request
- Issue JWT tokens with userId claim
- Validate JWT on each request
```

**Pros:**
- ✅ Tokens can be revoked immediately
- ✅ Short-lived tokens limit exposure
- ✅ Standard OAuth2 flow
- ✅ Can include additional claims (IP, device, etc.)
- ✅ Better audit trail

**Cons:**
- ❌ More complex implementation
- ❌ Requires token refresh logic in SDK
- ❌ More API calls (token refresh)

**Backend Changes:**
- New endpoint: `POST /oauth2/token` (for user API keys)
- Issue JWT tokens with userId
- Validate JWT on `/chat/completions`

---

### 5. **Device Fingerprinting** (Moderate Security)

**Concept:**
- Bind API key to device characteristics
- Store device fingerprint on first use
- Validate fingerprint on subsequent requests

**Implementation:**
```
First Request:
1. SDK generates device fingerprint:
   - User-Agent
   - Screen resolution
   - Timezone
   - Browser/OS version
   - (Hash of these)
2. Send fingerprint with request
3. Backend stores fingerprint for userId

Subsequent Requests:
1. SDK sends same fingerprint
2. Backend compares with stored fingerprint
3. If mismatch, require re-authentication or reject
```

**Pros:**
- ✅ Can detect key theft
- ✅ Doesn't require user action
- ✅ Works with existing API key format

**Cons:**
- ❌ Fingerprints can change (browser updates, etc.)
- ❌ Can be spoofed
- ❌ Not very secure alone
- ❌ False positives (legitimate device changes)

**Best Use:**
- Combine with other methods
- Use for anomaly detection

---

### 6. **Geolocation Validation** (Moderate Security)

**Concept:**
- Store expected geolocation for user
- Validate request origin location
- Reject requests from unexpected locations

**Implementation:**
```
Backend:
1. Extract client IP from request
2. Lookup geolocation (MaxMind, etc.)
3. Compare with stored allowed_locations
4. Reject if location not allowed
```

**Pros:**
- ✅ Can detect key theft (unusual location)
- ✅ Simple to implement
- ✅ Good for anomaly detection

**Cons:**
- ❌ VPNs can bypass
- ❌ Traveling users will be blocked
- ❌ Not very secure alone
- ❌ Requires geolocation service

**Best Use:**
- Combine with other methods
- Use for anomaly detection/alerting

---

### 7. **Rate Limiting & Anomaly Detection** (Detection, Not Prevention)

**Concept:**
- Monitor usage patterns per API key
- Detect unusual patterns (sudden spike, new IP, etc.)
- Alert or block suspicious activity

**Implementation:**
```
Backend:
1. Track per-key metrics:
   - Requests per hour/day
   - IP addresses used
   - Request patterns
   - Time of day patterns
2. Detect anomalies:
   - Sudden spike in requests
   - New IP address
   - Unusual time patterns
   - Unusual model/provider usage
3. Actions:
   - Alert admin
   - Temporarily block key
   - Require re-authentication
```

**Pros:**
- ✅ Can detect key theft after the fact
- ✅ Doesn't block legitimate users
- ✅ Good for monitoring

**Cons:**
- ❌ Doesn't prevent theft
- ❌ False positives
- ❌ Reactive, not proactive

**Best Use:**
- Combine with prevention methods
- Use for monitoring and alerting

---

### 8. **Key Rotation** (Best Practice)

**Concept:**
- Force periodic key rotation
- Old keys become invalid
- Users must generate new keys

**Implementation:**
```
Entity Attributes:
- created_at: timestamp
- expires_at: timestamp (e.g., 90 days)
- rotation_required: boolean

Backend:
1. Check expires_at on each request
2. If expired or rotation_required=true, reject with 401
3. User must generate new key via UI/CLI
```

**Pros:**
- ✅ Limits exposure window
- ✅ Forces security hygiene
- ✅ Standard best practice

**Cons:**
- ❌ User friction
- ❌ Doesn't prevent theft, just limits damage
- ❌ Need to handle rotation gracefully

**Best Use:**
- Combine with other methods
- Use as a security best practice

---

### 9. **Multi-Factor Authentication (MFA)** (High Security)

**Concept:**
- Require additional authentication factor
- API key + TOTP code, SMS code, etc.

**Implementation:**
```
Request Flow:
1. User makes request with API key
2. Backend checks if MFA required for user
3. If required, return 401 with challenge
4. SDK prompts user for MFA code
5. User provides code
6. SDK retries request with code
7. Backend validates code
8. Process request
```

**Pros:**
- ✅ Very secure
- ✅ Industry standard
- ✅ Prevents key theft alone from being sufficient

**Cons:**
- ❌ High user friction
- ❌ Complex implementation
- ❌ May not be suitable for all use cases
- ❌ Requires MFA service/infrastructure

**Best Use:**
- For high-security scenarios
- Optional feature for sensitive operations

---

### 10. **API Key + Secret Pair** (Similar to #3)

**Concept:**
- API key is public identifier
- Secret key is private (like password)
- Both required for authentication

**Implementation:**
```
Key Generation:
1. Generate userId
2. Generate secretKey (random 32 bytes)
3. API Key: sk-zs-{userId}-{publicId}
4. Secret Key: (shown once, user must store)

Request:
1. SDK sends: Authorization: Bearer {apiKey}:{secretKey}
2. Backend validates both
3. Or use secretKey to sign request (see #3)
```

**Pros:**
- ✅ Simple concept
- ✅ More secure than key alone
- ✅ Similar to username/password

**Cons:**
- ❌ Users must store secret securely
- ❌ Secret can still be stolen
- ❌ Not much better than single key if both stored together

---

## Recommended Approach: **Layered Security**

**Best Practice:** Combine multiple approaches for defense in depth.

### Tier 1: **Must Have** (High Priority)
1. ✅ **Cryptographic API Key Validation** - Validate key hash on backend
2. ✅ **IP Address Binding** - Enforce `allowed_ip_ranges` (already have data)
3. ✅ **Key Rotation** - Force periodic rotation

### Tier 2: **Should Have** (Medium Priority)
4. ✅ **Request Signing (HMAC)** - Sign requests with secret key
5. ✅ **Anomaly Detection** - Monitor and alert on unusual patterns
6. ✅ **Rate Limiting** - Prevent abuse

### Tier 3: **Nice to Have** (Optional)
7. ✅ **Token-Based** - Short-lived tokens instead of long-lived keys
8. ✅ **Geolocation Validation** - Detect unusual locations
9. ✅ **Device Fingerprinting** - Detect device changes
10. ✅ **MFA** - For high-security scenarios

---

## Implementation Priority

### Phase 1: Quick Wins (Implement First)
1. **IP Address Binding** - Already have the data, just need to enforce it
2. **Cryptographic Key Validation** - Store key hash, validate on requests
3. **Rate Limiting** - Basic per-key rate limits

### Phase 2: Enhanced Security
4. **Request Signing** - HMAC-based request signing
5. **Anomaly Detection** - Monitor and alert
6. **Key Rotation** - Force periodic rotation

### Phase 3: Advanced Features
7. **Token-Based Auth** - OAuth2-style tokens
8. **MFA** - Optional multi-factor authentication

---

## Comparison Table

| Approach | Security Level | Complexity | User Friction | Implementation Effort |
|----------|---------------|------------|---------------|---------------------|
| Cryptographic Validation | High | Medium | Low | Medium |
| IP Binding | Medium | Low | Medium | Low |
| Request Signing | Very High | High | Medium | High |
| Token-Based | High | High | Low | High |
| Device Fingerprinting | Low | Medium | Low | Medium |
| Geolocation | Low | Low | Medium | Low |
| Anomaly Detection | Low | Medium | None | Medium |
| Key Rotation | Medium | Low | Medium | Low |
| MFA | Very High | High | High | High |

---

## Recommended Implementation Plan

### Step 1: Immediate (Week 1)
- **IP Address Binding**: Enforce `allowed_ip_ranges` on backend
- **Cryptographic Validation**: Store API key hash, validate on requests

### Step 2: Short-term (Month 1)
- **Request Signing**: Implement HMAC-based signing
- **Rate Limiting**: Per-key rate limits
- **Anomaly Detection**: Basic monitoring

### Step 3: Long-term (Quarter 1)
- **Token-Based Auth**: OAuth2-style tokens
- **Key Rotation**: Automatic rotation
- **MFA**: Optional for high-security users

---

## Backend Changes Required

### For IP Binding:
```typescript
// On /chat/completions endpoint
const clientIp = req.headers['x-forwarded-for'] || req.ip
const entity = await getEntity(userId)
const allowedIps = entity.attrs.allowed_ip_ranges

if (!isIpAllowed(clientIp, allowedIps)) {
  return res.status(403).json({ error: 'IP address not allowed' })
}
```

### For Cryptographic Validation:
```typescript
// On key creation
const apiKeyHash = crypto.createHmac('sha256', SERVER_SECRET)
  .update(apiKey)
  .digest('hex')

// Store in entity
entity.attrs.api_key_hash = apiKeyHash

// On request validation
const providedHash = crypto.createHmac('sha256', SERVER_SECRET)
  .update(providedApiKey)
  .digest('hex')

if (providedHash !== entity.attrs.api_key_hash) {
  return res.status(401).json({ error: 'Invalid API key' })
}
```

### For Request Signing:
```typescript
// SDK signs request
const signature = crypto.createHmac('sha256', secretKey)
  .update(requestBody + timestamp)
  .digest('hex')

// Backend validates
const expectedSignature = crypto.createHmac('sha256', storedSecretKey)
  .update(requestBody + timestamp)
  .digest('hex')

if (signature !== expectedSignature) {
  return res.status(401).json({ error: 'Invalid signature' })
}
```

---

## Questions to Consider

1. **Use Case**: Are users server-to-server or client-side?
   - Server-to-server: IP binding works well
   - Client-side: Need token-based or request signing

2. **Security Requirements**: How sensitive is the data?
   - Low: IP binding + key validation
   - Medium: Add request signing
   - High: Add MFA + token-based

3. **User Experience**: How much friction is acceptable?
   - Low friction: IP binding + key validation
   - Medium: Request signing
   - High: MFA

4. **Infrastructure**: What can you build/maintain?
   - Simple: IP binding + key validation
   - Complex: Token-based + MFA

---

## Next Steps

1. **Decide on approach** based on your use case
2. **Implement Phase 1** (IP binding + cryptographic validation)
3. **Test thoroughly** with different scenarios
4. **Iterate** based on feedback and security needs
