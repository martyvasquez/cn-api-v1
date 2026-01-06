#!/usr/bin/env tsx

/**
 * Script to generate a new API key
 * Usage: npm run generate:api-key
 *
 * This script will prompt for:
 * - Client name
 * - Tier (basic, professional, enterprise)
 * - Optional expiration date
 *
 * It will then:
 * 1. Generate a new API key
 * 2. Store it in the database (hashed)
 * 3. Display the plain key (ONLY SHOWN ONCE!)
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import * as readline from 'readline';
import { createAPIKey } from '../lib/api-key';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  CN Database API - API Key Generator');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Get client name
    const clientName = await question('Client name: ');
    if (!clientName || clientName.trim().length === 0) {
      console.error('Error: Client name is required');
      process.exit(1);
    }

    // Get tier
    console.log('\nAvailable tiers:');
    console.log('  1. basic (1,000 calls/month)');
    console.log('  2. professional (10,000 calls/month)');
    console.log('  3. enterprise (100,000 calls/month)');
    const tierChoice = await question('\nSelect tier (1-3): ');

    let tier = 'basic';
    switch (tierChoice.trim()) {
      case '1':
        tier = 'basic';
        break;
      case '2':
        tier = 'professional';
        break;
      case '3':
        tier = 'enterprise';
        break;
      default:
        console.error('Invalid tier selection. Defaulting to "basic"');
        tier = 'basic';
    }

    // Get optional expiration
    const hasExpiration = await question('\nSet expiration date? (y/n): ');
    let expiresAt: Date | undefined;

    if (hasExpiration.toLowerCase() === 'y') {
      const expirationInput = await question(
        'Expiration date (YYYY-MM-DD) or days from now: '
      );

      if (expirationInput.match(/^\d+$/)) {
        // Number of days
        const days = parseInt(expirationInput, 10);
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      } else {
        // Parse as date
        expiresAt = new Date(expirationInput);
        if (isNaN(expiresAt.getTime())) {
          console.error('Invalid date format. No expiration will be set.');
          expiresAt = undefined;
        }
      }
    }

    console.log('\n' + '─'.repeat(50));
    console.log('Creating API key...');
    console.log('─'.repeat(50) + '\n');

    // Create the API key
    const result = await createAPIKey(clientName.trim(), tier, expiresAt);

    if (!result) {
      console.error('Failed to create API key. Check your database connection.');
      process.exit(1);
    }

    // Display the results
    console.log('✅ API Key created successfully!\n');
    console.log('═══════════════════════════════════════════');
    console.log('  ⚠️  SAVE THIS KEY - IT WILL NOT BE SHOWN AGAIN!');
    console.log('═══════════════════════════════════════════\n');
    console.log(`Client Name:  ${clientName}`);
    console.log(`Tier:         ${tier}`);
    console.log(`API Key ID:   ${result.record.id}`);
    console.log(`Expires:      ${expiresAt ? expiresAt.toISOString() : 'Never'}`);
    console.log(`Created:      ${result.record.created_at}\n`);
    console.log('─'.repeat(50));
    console.log('API Key (provide to client):');
    console.log('─'.repeat(50));
    console.log(`\n  ${result.plainKey}\n`);
    console.log('─'.repeat(50));
    console.log('\nUsage example:');
    console.log('curl -H "Authorization: Bearer ' + result.plainKey + '" \\');
    console.log('     https://your-api.vercel.app/api/products\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
