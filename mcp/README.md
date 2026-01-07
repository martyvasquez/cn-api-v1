# CN Database MCP Server

Model Context Protocol (MCP) server for the Child Nutrition Database API. This allows AI assistants like Claude Desktop to query the CN database directly.

## Overview

The CN Database MCP server provides 5 tools that Claude can use to search and retrieve nutrition information from the USDA Child Nutrition database:

- **cn_list_products** - List products with pagination and filtering
- **cn_search_products** - Full-text search across product names
- **cn_get_product** - Get detailed product information
- **cn_get_nutrition** - Get nutrition data for a product
- **cn_get_servings** - Get serving size conversions

## Two Ways to Connect

### Option 1: Remote Connector (Recommended - No Setup Required)

Use the HTTP MCP endpoint deployed on Vercel. This is the easiest way to connect Claude Desktop to the CN Database.

**Setup:**
1. Get an API key (contact the API administrator or generate one if you have access)
2. In Claude Desktop, go to **Settings** → **Connectors** → **Add Custom Connector**
3. Configure:
   - **Name**: `CN Database`
   - **URL**: `https://cn-api-v1.vercel.app/api/mcp?api_key=YOUR_API_KEY_HERE`

Replace `YOUR_API_KEY_HERE` with your actual `cn_live_` API key.

**That's it!** Claude can now query the CN database directly.

### Option 2: Local MCP Server (Advanced)

Run the MCP server locally on your machine using Node.js. This requires more setup but gives you full control.

See [Local Setup Instructions](#local-setup-advanced) below for details.

---

## Remote Connector Setup (Detailed)

### Step 1: Get an API Key

You need a valid CN Database API key starting with `cn_live_`.

**If you have access to generate keys:**
```bash
npm run quick-key -- "Your Name" basic
```

**If you don't have access:** Contact the API administrator to provide you with an API key.

### Step 2: Add to Claude Desktop

1. Open **Claude Desktop**
2. Go to **Settings** (gear icon in the bottom left)
3. Click **Connectors** in the sidebar
4. Click **Add Custom Connector**
5. Fill in the form:
   - **Name**: `CN Database` (or any name you prefer)
   - **URL**: `https://cn-api-v1.vercel.app/api/mcp?api_key=cn_live_YOUR_KEY_HERE`

   Replace `cn_live_YOUR_KEY_HERE` with your actual API key.

6. Click **Save**

### Step 3: Start Using It!

In any Claude chat, you can now ask questions like:
- "List all dairy products in the CN database"
- "Search for whole wheat bread products"
- "What are the nutrition facts for CN number 122134?"
- "Show me serving conversions for butter"

Claude will automatically use the CN Database MCP tools to answer your questions.

### Troubleshooting Remote Connector

**Issue: "Connection failed" or "Server not responding"**
- Verify your API key is correct and starts with `cn_live_`
- Check that the URL is exactly: `https://cn-api-v1.vercel.app/api/mcp?api_key=YOUR_KEY`
- Ensure you haven't exceeded your monthly API usage limit

**Issue: "Invalid API key"**
- Make sure the API key is active and not expired
- Contact the administrator if you need a new key

**Issue: "Rate limit exceeded"**
- You've hit your monthly usage limit
- Upgrade your tier or wait until next month for the limit to reset

---

## Local Setup (Advanced)

This section is for users who want to run the MCP server locally on their machine.

## Prerequisites

1. **Node.js 18+** installed
2. **API Key** for the CN Database API
   - Generate one using: `npm run quick-key -- "Your Name" basic`
   - Or use the interactive generator: `npm run generate:api-key`
3. **Claude Desktop** (for local testing)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create or update `.env.local` in the project root:

```bash
# CN Database API Configuration
MCP_API_BASE_URL=http://localhost:3000  # For development
# MCP_API_BASE_URL=https://cn-api-v1.vercel.app  # For production

# Your API Key
MCP_API_KEY=cn_live_your_api_key_here

# Optional: Logging level
MCP_LOG_LEVEL=info  # Options: debug, info, warn, error
```

### 3. Start the MCP Server (Development)

```bash
npm run mcp:dev
```

This starts the server with hot-reload enabled.

### 4. Configure Claude Desktop

Add the MCP server to your Claude Desktop configuration:

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "cn-database": {
      "command": "node",
      "args": ["--loader", "tsx", "/absolute/path/to/cn-v2/mcp/server.ts"],
      "env": {
        "MCP_API_BASE_URL": "https://cn-api-v1.vercel.app",
        "MCP_API_KEY": "cn_live_your_api_key_here"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/cn-v2` with the actual path to your project.

### 5. Restart Claude Desktop

Close and reopen Claude Desktop for the changes to take effect.

## Available Tools

### cn_list_products

List CN products with optional filtering.

**Parameters:**
- `limit` (optional): Number of items to return (1-100, default: 20)
- `offset` (optional): Number of items to skip for pagination (default: 0)
- `category` (optional): Filter by category (e.g., "Dairy and Egg Products")
- `manufacturer` (optional): Filter by manufacturer name

**Example Usage in Claude:**
```
List 10 dairy products
```

---

### cn_search_products

Search products by name using full-text search.

**Parameters:**
- `query` (required): Search term (e.g., "butter", "whole wheat bread")
- `category` (optional): Filter results by category
- `manufacturer` (optional): Filter results by manufacturer
- `limit` (optional): Number of results (1-100, default: 20)
- `offset` (optional): Pagination offset

**Example Usage in Claude:**
```
Search for organic milk products
```

---

### cn_get_product

Get detailed information for a specific product.

**Parameters:**
- `cn_number` (required): The CN number (e.g., "1001")

**Example Usage in Claude:**
```
Show me details for CN product 1001
```

---

### cn_get_nutrition

Get nutrition information for a product.

**Parameters:**
- `cn_number` (required): The CN number

**Example Usage in Claude:**
```
What's the nutrition info for CN 1001?
```

---

### cn_get_servings

Get serving size conversions for a product.

**Parameters:**
- `cn_number` (required): The CN number

**Example Usage in Claude:**
```
Show serving conversions for butter (CN 1001)
```

## Usage Examples

Once configured in Claude Desktop, you can ask questions like:

- "List all dairy products"
- "Search for whole wheat bread"
- "What are the nutrition facts for CN number 1001?"
- "Show me the serving sizes for butter"
- "Find products made by General Mills"
- "List the first 5 products in the Meat category"

Claude will automatically use the appropriate MCP tools to query the database and provide formatted responses.

## Troubleshooting

### MCP Server Not Appearing in Claude Desktop

1. Check that `claude_desktop_config.json` is valid JSON
2. Verify the absolute path to `server.ts` is correct
3. Ensure environment variables are set correctly
4. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log`

### Authentication Errors

```
Error: Invalid or inactive API key
```

**Solutions:**
- Verify `MCP_API_KEY` is set correctly in `.env.local`
- Ensure the API key starts with `cn_live_`
- Check that the key is active and not expired
- Generate a new key if needed: `npm run quick-key -- "Test" basic`

### Connection Errors

```
Error: Failed to fetch
```

**Solutions:**
- Check that `MCP_API_BASE_URL` is correct
- Ensure the Next.js API is running (if using localhost)
- Verify network connectivity (if using production URL)

### Tool Not Found Errors

```
Unknown tool: cn_list_products
```

**Solutions:**
- Restart Claude Desktop
- Verify the MCP server started without errors
- Check MCP server logs for initialization issues

## Development

### Running Tests

```bash
# Test the API client
npm run mcp:dev

# In another terminal, test with curl:
curl "http://localhost:3000/api/products/1001?api_key=your_key"
```

### Building for Production

```bash
npm run mcp:build
```

This compiles TypeScript to JavaScript in the `dist/mcp` directory.

### Debugging

Enable debug logging by setting:

```bash
MCP_LOG_LEVEL=debug
```

This will show detailed information about:
- Tool calls and parameters
- API requests and responses
- Error stack traces

## Security Notes

- **API keys in URLs**: The MCP server uses URL parameter authentication (`?api_key=xxx`) for simplicity. This is less secure than Bearer tokens as keys may appear in server logs.
- **Recommendation**: Only use URL-based auth for MCP/programmatic access. Use Bearer tokens for browser-based or public clients.
- **HTTPS**: Always use HTTPS in production (`https://cn-api-v1.vercel.app`)
- **Key rotation**: Regularly rotate API keys for security

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main project README
3. Check API documentation at the project root
4. Report issues on GitHub

## License

Same as the main CN Database API project.
