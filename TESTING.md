# Testing Checklist for CN Database API

## ✅ Tests We Just Completed (No Supabase Required)

### Build & TypeScript Compilation
- [x] `npm run build` - Production build succeeds
- [x] TypeScript compilation passes
- [x] All routes are properly detected
- [x] Middleware compiles correctly

**Result:** All builds pass without Supabase credentials!

---

## 🔄 Tests to Run After Supabase Setup

### 1. Database Setup (5 minutes)

**Steps:**
1. Create Supabase project at https://supabase.com
2. Run migration SQL (`supabase/migrations/001_initial_schema.sql`)
3. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
4. Verify billing tiers seeded:
   ```sql
   SELECT * FROM billing_tiers;
   ```

**Expected Result:**
- 5 tables created: `cn_products`, `api_keys`, `billing_tiers`, `api_usage`, `monthly_usage_summary`
- 3 billing tiers inserted
- All indexes created

---

### 2. Environment Configuration

**Steps:**
1. Copy `.env.local.example` to `.env.local`
2. Add your Supabase credentials
3. Restart dev server: `npm run dev`

**Test:**
```bash
# Server should start without errors
npm run dev
```

**Expected Result:**
- Dev server starts on port 3000
- No environment variable errors

---

### 3. Data Import (2-3 minutes)

**Test:**
```bash
npm run import:data
```

**Expected Result:**
- CSV files parsed successfully
- Products imported to database
- Nutrition data linked correctly
- Success message with count

**Verify in Supabase:**
```sql
SELECT COUNT(*) FROM cn_products;
SELECT * FROM cn_products LIMIT 5;
```

---

### 4. API Key Generation

**Test:**
```bash
npm run generate:api-key
```

**Input:**
- Client name: "Test Client"
- Tier: 1 (basic)
- Expiration: n

**Expected Result:**
- API key generated (starts with `cn_live_`)
- Key stored in database (hashed)
- Plain key displayed (save this!)

**Verify in Supabase:**
```sql
SELECT id, client_name, tier, is_active, created_at
FROM api_keys
WHERE client_name = 'Test Client';
```

---

### 5. API Endpoint Tests

Save your API key as an environment variable:
```bash
export API_KEY="cn_live_your_key_here"
```

#### Test 1: List Products (No Auth - Should Fail)
```bash
curl http://localhost:3000/api/products
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Missing Authorization header..."
}
```
**Status Code:** 401

---

#### Test 2: List Products (With Auth - Should Work)
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products?limit=5
```

**Expected Result:**
```json
{
  "success": true,
  "data": [
    {
      "cn_number": "1001",
      "product_name": "Butter, salted",
      "category": "Dairy Products",
      ...
    }
  ],
  "meta": {
    "usage": {
      "current": 1,
      "limit": 1000,
      "tier": "basic",
      "remaining": 999
    },
    "pagination": {
      "total": 5000,
      "limit": 5,
      "offset": 0,
      "hasMore": true
    }
  }
}
```
**Status Code:** 200

---

#### Test 3: Search Products
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products/search?q=butter&limit=3"
```

**Expected Result:**
- Products matching "butter" returned
- Usage counter incremented to 2
- Pagination works

**Status Code:** 200

---

#### Test 4: Get Product Details
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products/1001
```

**Expected Result:**
- Single product returned
- All fields populated
- Usage incremented

**Status Code:** 200

---

#### Test 5: Get Nutrition Data
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products/1001/nutrition
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "cn_number": "1001",
    "product_name": "Butter, salted",
    "serving_size": "100g",
    "nutrition": {
      "pro": 0.85,
      "fat": 81.11,
      ...
    }
  },
  "meta": {
    "usage": { ... }
  }
}
```
**Status Code:** 200

---

#### Test 6: Product Not Found
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products/99999
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Product with CN number \"99999\" not found"
}
```
**Status Code:** 404

---

#### Test 7: Search Without Query
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products/search"
```

**Expected Result:**
```json
{
  "success": false,
  "error": "Search query parameter \"q\" is required"
}
```
**Status Code:** 400

---

### 6. Rate Limiting Tests

#### Test 8: Check Usage Stats
```bash
# Get your API key ID from the database first
curl http://localhost:3000/api/admin/usage/YOUR_API_KEY_ID
```

**Expected Result:**
- Current month usage shown
- Usage matches number of requests made
- Tier limits correct

---

#### Test 9: Rate Limit Enforcement

```bash
# Make requests until limit exceeded
# For basic tier (1000 limit), this would take a while
# Instead, update tier limit for testing:
```

**In Supabase SQL Editor:**
```sql
UPDATE billing_tiers
SET monthly_call_limit = 5
WHERE tier_name = 'basic';
```

**Then make 6 requests:**
```bash
for i in {1..6}; do
  curl -H "Authorization: Bearer $API_KEY" \
    http://localhost:3000/api/products?limit=1
  echo "\nRequest $i"
done
```

**Expected Result:**
- Requests 1-5: Success (200)
- Request 6: Rate limit error (429)

```json
{
  "success": false,
  "error": "Rate limit exceeded. You have used 5 of 5 calls this month.",
  "meta": {
    "usage": {
      "current": 5,
      "limit": 5,
      "tier": "basic",
      "remaining": 0
    }
  }
}
```

**Reset for further testing:**
```sql
-- Reset tier limit
UPDATE billing_tiers
SET monthly_call_limit = 1000
WHERE tier_name = 'basic';

-- Reset usage
DELETE FROM monthly_usage_summary
WHERE api_key_id = 'YOUR_API_KEY_ID';

DELETE FROM api_usage
WHERE api_key_id = 'YOUR_API_KEY_ID';
```

---

### 7. Edge Cases & Security

#### Test 10: Invalid API Key
```bash
curl -H "Authorization: Bearer cn_live_invalid_key_123" \
  http://localhost:3000/api/products
```

**Expected:** 401 error

---

#### Test 11: Malformed Authorization Header
```bash
curl -H "Authorization: Invalid Format" \
  http://localhost:3000/api/products
```

**Expected:** 401 error with helpful message

---

#### Test 12: SQL Injection Attempt
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products/search?q=' OR 1=1--"
```

**Expected:**
- No SQL injection (parameterized queries)
- Empty results or sanitized search

---

#### Test 13: Expired API Key

**In Supabase:**
```sql
UPDATE api_keys
SET expires_at = '2020-01-01'
WHERE id = 'YOUR_API_KEY_ID';
```

**Test:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products
```

**Expected:** 401 Unauthorized

**Reset:**
```sql
UPDATE api_keys
SET expires_at = NULL
WHERE id = 'YOUR_API_KEY_ID';
```

---

#### Test 14: Inactive API Key

**In Supabase:**
```sql
UPDATE api_keys
SET is_active = false
WHERE id = 'YOUR_API_KEY_ID';
```

**Test:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3000/api/products
```

**Expected:** 401 Unauthorized

**Reset:**
```sql
UPDATE api_keys
SET is_active = true
WHERE id = 'YOUR_API_KEY_ID';
```

---

### 8. Performance & Load Tests

#### Test 15: Pagination Performance
```bash
# Test different page sizes
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products?limit=100&offset=0"

curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products?limit=100&offset=100"
```

**Expected:**
- Fast response times (< 500ms)
- Correct offset handling

---

#### Test 16: Filter Performance
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3000/api/products?category=Dairy&limit=50"
```

**Expected:**
- Only products in specified category
- Fast query (indexes working)

---

### 9. Usage Tracking Accuracy

#### Test 17: Verify Usage Logging

**Make 10 requests:**
```bash
for i in {1..10}; do
  curl -s -H "Authorization: Bearer $API_KEY" \
    http://localhost:3000/api/products?limit=1 > /dev/null
done
```

**Verify in Supabase:**
```sql
-- Check api_usage table
SELECT endpoint, COUNT(*) as calls
FROM api_usage
WHERE api_key_id = 'YOUR_API_KEY_ID'
GROUP BY endpoint;

-- Check monthly_usage_summary
SELECT total_calls
FROM monthly_usage_summary
WHERE api_key_id = 'YOUR_API_KEY_ID';
```

**Expected:**
- 10 entries in `api_usage`
- `total_calls` = 10 in `monthly_usage_summary`

---

## 📊 Test Summary Checklist

After running all tests, verify:

- [ ] All API endpoints return correct data
- [ ] Authentication works correctly
- [ ] Rate limiting enforces tier limits
- [ ] Usage tracking is accurate
- [ ] Error messages are helpful and secure
- [ ] Security measures prevent common attacks
- [ ] Performance is acceptable (< 500ms)
- [ ] Pagination works correctly
- [ ] Filters work as expected
- [ ] Invalid inputs handled gracefully

---

## 🚀 Ready for Deployment

Once all tests pass:

1. Push code to GitHub
2. Deploy to Vercel
3. Add production environment variables
4. Test production endpoints
5. Generate production API keys for clients

---

## 📝 Testing Notes

**Current Status:**
- ✅ Build tests: PASSED
- ⏳ Database tests: Requires Supabase setup
- ⏳ API tests: Requires Supabase setup
- ⏳ Security tests: Requires Supabase setup

**Next Steps:**
1. Set up Supabase project
2. Run database migrations
3. Import CN data
4. Generate test API key
5. Run all API endpoint tests
