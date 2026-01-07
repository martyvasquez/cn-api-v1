#!/usr/bin/env tsx

/**
 * Quick API Key Generator (non-interactive)
 * Usage:
 *   npm run quick-key -- "Client Name" basic
 *   npm run quick-key -- "Acme Corp" professional 365
 *   npm run quick-key -- "Enterprise Client" enterprise
 *
 * Args:
 *   1. Client name (required)
 *   2. Tier: basic|professional|enterprise (default: basic)
 *   3. Expiration days (optional, default: no expiration)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { createAPIKey } from '../lib/api-key';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm run quick-key -- "Client Name" [tier] [expiration_days]');
    console.error('\nExamples:');
    console.error('  npm run quick-key -- "Acme Corp" professional 365');
    console.error('  npm run quick-key -- "Test Client" basic');
    console.error('\nTiers: basic (default), professional, enterprise');
    process.exit(1);
  }

  const clientName = args[0];
  const tier = args[1] || 'basic';
  const expirationDays = args[2] ? parseInt(args[2], 10) : undefined;

  // Validate tier
  const validTiers = ['basic', 'professional', 'enterprise'];
  if (!validTiers.includes(tier)) {
    console.error(`Invalid tier: ${tier}`);
    console.error(`Valid tiers: ${validTiers.join(', ')}`);
    process.exit(1);
  }

  // Calculate expiration
  let expiresAt: Date | undefined;
  if (expirationDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);
  }

  console.log('═══════════════════════════════════════════');
  console.log('  Quick API Key Generator');
  console.log('═══════════════════════════════════════════\n');
  console.log(`Client:   ${clientName}`);
  console.log(`Tier:     ${tier}`);
  console.log(`Expires:  ${expiresAt ? expiresAt.toISOString().split('T')[0] : 'Never'}`);
  console.log('\nGenerating key...\n');

  try {
    const result = await createAPIKey(clientName, tier, expiresAt);

    if (!result) {
      console.error('❌ Failed to create API key');
      process.exit(1);
    }

    console.log('✅ Success!\n');
    console.log('═══════════════════════════════════════════');
    console.log('  API KEY (save this - shown only once!)');
    console.log('═══════════════════════════════════════════\n');
    console.log(`  ${result.plainKey}\n`);
    console.log('═══════════════════════════════════════════');
    console.log(`Key ID:      ${result.record.id}`);
    console.log(`Monthly Limit: See tier settings`);
    console.log('\nProvide this key to your client.');
    console.log('They should use it in the Authorization header:\n');
    console.log(`Authorization: Bearer ${result.plainKey}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
