/**
 * MCP Server Configuration
 * Manages environment variables and configuration for the MCP server
 */

export interface MCPConfig {
  apiBaseUrl: string;
  apiKey: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const config: MCPConfig = {
  apiBaseUrl: getOptionalEnv('MCP_API_BASE_URL', 'http://localhost:3000'),
  apiKey: getOptionalEnv('MCP_API_KEY', ''),
  logLevel: (getOptionalEnv('MCP_LOG_LEVEL', 'info') as MCPConfig['logLevel']),
};

// Validate API key format only if provided
if (config.apiKey && !config.apiKey.startsWith('cn_live_')) {
  throw new Error('MCP_API_KEY must start with "cn_live_"');
}

// Log configuration only if API key is provided (excluding sensitive data)
if (config.apiKey) {
  console.error('MCP Server Configuration:');
  console.error(`  API Base URL: ${config.apiBaseUrl}`);
  console.error(`  API Key: ${config.apiKey.substring(0, 15)}...`);
  console.error(`  Log Level: ${config.logLevel}`);
}
