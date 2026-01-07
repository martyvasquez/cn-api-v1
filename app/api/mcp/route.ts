/**
 * MCP HTTP Endpoint
 * Provides MCP server over HTTP for remote Claude Desktop connectivity
 */

import { NextRequest } from 'next/server';

// Import MCP tool definitions
import { listProductsTool } from '@/mcp/tools/list-products';
import { searchProductsTool } from '@/mcp/tools/search-products';
import { getProductTool } from '@/mcp/tools/get-product';
import { getNutritionTool } from '@/mcp/tools/get-nutrition';
import { getServingsTool } from '@/mcp/tools/get-servings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const tools = [
  listProductsTool,
  searchProductsTool,
  getProductTool,
  getNutritionTool,
  getServingsTool,
];

// Tool handlers that accept apiKey
async function handleListProducts(args: any, apiKey: string) {
  const { handleListProducts } = await import('@/mcp/tools/list-products');
  return handleListProducts(args, apiKey);
}

async function handleSearchProducts(args: any, apiKey: string) {
  const { handleSearchProducts } = await import('@/mcp/tools/search-products');
  return handleSearchProducts(args, apiKey);
}

async function handleGetProduct(args: any, apiKey: string) {
  const { handleGetProduct } = await import('@/mcp/tools/get-product');
  return handleGetProduct(args, apiKey);
}

async function handleGetNutrition(args: any, apiKey: string) {
  const { handleGetNutrition } = await import('@/mcp/tools/get-nutrition');
  return handleGetNutrition(args, apiKey);
}

async function handleGetServings(args: any, apiKey: string) {
  const { handleGetServings } = await import('@/mcp/tools/get-servings');
  return handleGetServings(args, apiKey);
}

const toolHandlers: Record<string, (args: any, apiKey: string) => Promise<any>> = {
  cn_list_products: handleListProducts,
  cn_search_products: handleSearchProducts,
  cn_get_product: handleGetProduct,
  cn_get_nutrition: handleGetNutrition,
  cn_get_servings: handleGetServings,
};

export async function POST(request: NextRequest) {
  try {
    // Get API key from URL parameter
    const apiKey = request.nextUrl.searchParams.get('api_key');

    if (!apiKey || !apiKey.startsWith('cn_live_')) {
      return Response.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Invalid API key. Provide via ?api_key=cn_live_xxx parameter',
          },
          id: null,
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { method, params, id } = body;

    // Handle initialize
    if (method === 'initialize') {
      return Response.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'cn-database-api',
            version: '1.0.0',
          },
          capabilities: {
            tools: {},
          },
        },
        id,
      });
    }

    // Handle tools/list
    if (method === 'tools/list') {
      return Response.json({
        jsonrpc: '2.0',
        result: {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        },
        id,
      });
    }

    // Handle tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const handler = toolHandlers[name];

      if (!handler) {
        return Response.json({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: `Unknown tool: ${name}`,
          },
          id,
        });
      }

      try {
        const result = await handler(args || {}, apiKey);
        return Response.json({
          jsonrpc: '2.0',
          result,
          id,
        });
      } catch (error) {
        return Response.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Tool execution failed',
          },
          id,
        });
      }
    }

    // Unknown method
    return Response.json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
      id,
    });
  } catch (error) {
    return Response.json({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error',
      },
      id: null,
    });
  }
}

export async function GET() {
  return Response.json({
    name: 'CN Database MCP Server',
    version: '1.0.0',
    description: 'Model Context Protocol server for Child Nutrition Database API',
    tools: tools.length,
    endpoint: '/api/mcp',
    usage: 'POST JSON-RPC 2.0 requests to this endpoint with ?api_key=cn_live_xxx parameter',
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
