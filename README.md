# CN Database API

A usage-metered REST API for the USDA Child Nutrition (CN) Database with tiered billing, API key authentication, and rate limiting.

## Features

- **RESTful API** - Search, list, and retrieve CN product data
- **MCP Support** - Model Context Protocol server for AI assistants (Claude Desktop)
- **API Key Authentication** - Secure Bearer token + URL parameter authentication
- **Usage-Based Billing** - Three tiers with monthly call limits
- **Rate Limiting** - Automatic enforcement of tier limits
- **Usage Tracking** - Real-time usage monitoring and statistics
- **Supabase Backend** - PostgreSQL database with Row Level Security
- **Next.js 14** - Modern App Router with TypeScript
- **Easy Deployment** - One-click deploy to Vercel

## Tech Stack

- **Backend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript
- **Deployment**: Vercel
- **Authentication**: API Key (Bearer token)

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account ([sign up free](https://supabase.com))
- CN Database CSV files (already included in `cn-assets/`)

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API**
3. Copy your:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 3. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Database Migrations

In the Supabase SQL Editor, run the migration file:

```sql
-- Copy and paste contents from:
supabase/migrations/001_initial_schema.sql
```

This creates:
- `cn_products` - Product data
- `api_keys` - API key management
- `billing_tiers` - Tier configuration
- `api_usage` - Usage tracking
- `monthly_usage_summary` - Aggregated usage stats

### 5. Import CN Database

```bash
npm install
npm run import:data
```

This imports all products from the CSV files in `cn-assets/`.

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## API Endpoints

All endpoints require authentication via API key.

### Authentication

Include your API key in the `Authorization` header:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Endpoints

#### 1. List Products

```http
GET /api/products
```

**Query Parameters:**
- `limit` (number, default: 20, max: 100) - Items per page
- `offset` (number, default: 0) - Pagination offset
- `category` (string, optional) - Filter by category
- `manufacturer` (string, optional) - Filter by manufacturer

**Example:**

```bash
curl -H "Authorization: Bearer cn_live_abc123..." \
  "https://your-api.vercel.app/api/products?limit=10&category=Dairy"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cn_number": "1001",
      "product_name": "Butter, salted",
      "category": "Dairy Products",
      "manufacturer": null,
      "serving_size": "100g",
      "nutrition_data": { ... },
      "metadata": { ... }
    }
  ],
  "meta": {
    "usage": {
      "current": 150,
      "limit": 1000,
      "tier": "basic",
      "remaining": 850
    },
    "pagination": {
      "total": 5000,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### 2. Search Products

```http
GET /api/products/search
```

**Query Parameters:**
- `q` (string, **required**) - Search term
- `category` (string, optional) - Filter by category
- `manufacturer` (string, optional) - Filter by manufacturer
- `limit` (number, default: 20, max: 100)
- `offset` (number, default: 0)

**Example:**

```bash
curl -H "Authorization: Bearer cn_live_abc123..." \
  "https://your-api.vercel.app/api/products/search?q=butter"
```

#### 3. Get Product Details

```http
GET /api/products/:cnNumber
```

**Example:**

```bash
curl -H "Authorization: Bearer cn_live_abc123..." \
  "https://your-api.vercel.app/api/products/1001"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cn_number": "1001",
    "product_name": "Butter, salted",
    "category": "Dairy Products",
    "manufacturer": null,
    "serving_size": "100g",
    "nutrition_data": {
      "pro": 0.85,
      "fat": 81.11,
      "carbs": 0.06,
      "calories": 717
    },
    "metadata": {
      "brand_name": null,
      "date_added": "01/31/1994"
    }
  },
  "meta": {
    "usage": { ... }
  }
}
```

#### 4. Get Nutrition Information

```http
GET /api/products/:cnNumber/nutrition
```

**Example:**

```bash
curl -H "Authorization: Bearer cn_live_abc123..." \
  "https://your-api.vercel.app/api/products/1001/nutrition"
```

**Response:**

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
      "carbs": 0.06,
      "calories": 717,
      "fiber": 0,
      "sodium": 643
    }
  },
  "meta": {
    "usage": { ... }
  }
}
```

### Admin Endpoints

#### Get Usage Statistics

```http
GET /api/admin/usage/:apiKeyId
```

**Query Parameters:**
- `months` (number, default: 3) - Months of history

**Example:**

```bash
curl "http://localhost:3000/api/admin/usage/uuid-here?months=6"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "apiKey": {
      "id": "uuid",
      "client_name": "Client Name",
      "tier": "professional",
      "is_active": true
    },
    "currentMonth": {
      "usage": 1542,
      "limit": 10000,
      "remaining": 8458,
      "percentUsed": 15.42
    },
    "tier": {
      "name": "professional",
      "monthly_call_limit": 10000,
      "price_monthly": 29.00
    },
    "history": [...]
  }
}
```

## Billing Tiers

| Tier | Monthly Calls | Price/Month |
|------|---------------|-------------|
| Basic | 1,000 | $0 (Free) |
| Professional | 10,000 | $29 |
| Enterprise | 100,000 | $149 |

Update tiers in Supabase:

```sql
UPDATE billing_tiers
SET monthly_call_limit = 5000, price_monthly = 49.00
WHERE tier_name = 'professional';
```

## API Key Management

### Generate a New API Key

```bash
npm run generate:api-key
```

Follow the prompts to create a key. **Save the generated key** - it won't be shown again!

### Manual Creation (via Supabase)

1. Generate a key:
   ```javascript
   const key = `cn_live_${nanoid(32)}`;
   ```

2. Hash it:
   ```javascript
   const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
   ```

3. Insert into `api_keys` table:
   ```sql
   INSERT INTO api_keys (key, client_name, tier, is_active)
   VALUES ('hashed-key-here', 'Client Name', 'basic', true);
   ```

4. Provide the **unhashed** key to the client

### Revoke an API Key

```sql
UPDATE api_keys
SET is_active = false
WHERE id = 'uuid-here';
```

## MCP Support (Model Context Protocol)

The CN Database API includes an MCP server that allows AI assistants like Claude Desktop to query the database directly.

### Quick Start with Claude Desktop

1. **Generate an API key:**
   ```bash
   npm run quick-key -- "My Name" basic
   ```

2. **Configure Claude Desktop:**

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "cn-database": {
         "command": "node",
         "args": ["--loader", "tsx", "/path/to/cn-v2/mcp/server.ts"],
         "env": {
           "MCP_API_BASE_URL": "https://cn-api-v1.vercel.app",
           "MCP_API_KEY": "cn_live_your_api_key_here"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

### Available MCP Tools

- **cn_list_products** - List products with filtering
- **cn_search_products** - Full-text search
- **cn_get_product** - Get product details
- **cn_get_nutrition** - Get nutrition data
- **cn_get_servings** - Get serving conversions

### Example Usage in Claude

Once configured, you can ask Claude:

- "List all dairy products"
- "Search for whole wheat bread"
- "What are the nutrition facts for CN number 1001?"
- "Show serving sizes for butter"

For detailed MCP setup instructions, see [mcp/README.md](./mcp/README.md).

### URL-Based Authentication

The API supports both Bearer token and URL parameter authentication:

**Bearer Token (Recommended):**
```bash
curl -H "Authorization: Bearer cn_live_abc123..." \
  "https://your-api.vercel.app/api/products/1001"
```

**URL Parameter (for MCP/programmatic access):**
```bash
curl "https://your-api.vercel.app/api/products/1001?api_key=cn_live_abc123..."
```

**Note:** URL parameter authentication is less secure as API keys may appear in server logs. Use Bearer tokens for browser-based or public clients.

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "meta": {
    "usage": { ... }
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (invalid/missing API key)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Internal server error

## Rate Limiting

When a client exceeds their monthly limit:

```json
{
  "success": false,
  "error": "Rate limit exceeded. You have used 1000 of 1000 calls this month.",
  "meta": {
    "usage": {
      "current": 1000,
      "limit": 1000,
      "tier": "basic",
      "remaining": 0
    }
  }
}
```

Usage resets on the 1st of each month.

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

### Environment Variables in Production

Never commit `.env.local` to git. Add production values in Vercel dashboard:

**Settings** → **Environment Variables**

## Development

### Project Structure

```
cn-v2/
├── app/
│   └── api/
│       ├── products/
│       │   ├── route.ts                    # List products
│       │   ├── search/route.ts             # Search
│       │   └── [cnNumber]/
│       │       ├── route.ts                # Product details
│       │       └── nutrition/route.ts      # Nutrition info
│       └── admin/
│           └── usage/[apiKeyId]/route.ts   # Usage stats
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── api-key.ts           # API key utilities
│   ├── usage-tracker.ts     # Usage tracking & rate limiting
│   ├── auth-helpers.ts      # Auth & response helpers
│   └── types.ts             # TypeScript types
├── scripts/
│   ├── generate-api-key.ts  # API key generator
│   └── import-cn-data.ts    # Data import script
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── middleware.ts            # API key validation middleware
└── cn-assets/              # CN Database CSV files
```

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

npm run import:data          # Import CN database from CSV
npm run import:complete      # Import ALL CN data (complete dataset)
npm run generate:api-key     # Generate new API key (interactive)
npm run quick-key            # Quick API key generation

npm run mcp:dev             # Start MCP server with hot-reload
npm run mcp:start           # Start MCP server
npm run mcp:build           # Build MCP server
```

## Security Considerations

- API keys are **hashed** before storage (SHA-256)
- Service role key is **server-side only**
- Row Level Security (RLS) enabled on all tables
- Rate limiting prevents abuse
- HTTPS enforced in production (via Vercel)
- Input sanitization on all queries

## Monitoring & Analytics

Track API usage in Supabase:

```sql
-- Top users by usage this month
SELECT ak.client_name, ak.tier, mus.total_calls
FROM monthly_usage_summary mus
JOIN api_keys ak ON mus.api_key_id = ak.id
WHERE mus.billing_month = '2025-01'
ORDER BY mus.total_calls DESC
LIMIT 10;

-- Usage by endpoint
SELECT endpoint, COUNT(*) as calls
FROM api_usage
WHERE billing_month = '2025-01'
GROUP BY endpoint
ORDER BY calls DESC;
```

## Future Enhancements

- [ ] Customer self-service portal
- [ ] Stripe integration for automated billing
- [ ] Webhook notifications for usage alerts
- [ ] GraphQL endpoint
- [ ] Redis caching layer
- [ ] API analytics dashboard
- [ ] Webhook for usage threshold alerts (75%, 90%, 100%)

## Support

For issues or questions:
- Check the [API documentation](#api-endpoints) above
- Review error messages in responses
- Verify environment variables are set correctly
- Check Supabase logs for database errors

## License

Proprietary - All rights reserved
