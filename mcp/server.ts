#!/usr/bin/env node

/**
 * CN Database MCP Server
 * Model Context Protocol server for the Child Nutrition Database API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Import after dotenv config
import { tools, toolHandlers } from './tools/index.js';
import { config } from './config.js';

// Create MCP server
const server = new Server(
  {
    name: 'cn-database-api',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('[MCP Server] Listing available tools...');
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP Server] Tool called: ${name}`);
  if (config.logLevel === 'debug') {
    console.error(`[MCP Server] Arguments: ${JSON.stringify(args, null, 2)}`);
  }

  const handler = toolHandlers[name];

  if (!handler) {
    console.error(`[MCP Server] Unknown tool: ${name}`);
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    const result = await handler(args);

    if (config.logLevel === 'debug') {
      console.error(`[MCP Server] Tool ${name} completed successfully`);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[MCP Server] Tool ${name} failed: ${errorMessage}`);

    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  console.error('═══════════════════════════════════════════════');
  console.error('  CN Database MCP Server');
  console.error('═══════════════════════════════════════════════');
  console.error('');
  console.error(`Available tools: ${tools.length}`);
  tools.forEach((tool) => {
    console.error(`  - ${tool.name}: ${tool.description.substring(0, 60)}...`);
  });
  console.error('');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('MCP Server running on stdio');
  console.error('Waiting for requests from Claude Desktop...');
  console.error('');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
