import { createHash } from 'crypto';
import { nanoid } from 'nanoid';
import { supabaseAdmin } from './supabase';
import type { APIKey } from './types';

/**
 * Generate a new API key
 * Returns a readable key that should be given to the client (one-time only)
 */
export function generateAPIKey(): string {
  // Generate a 32-character random key
  // Format: cn_live_<nanoid> for easy identification
  return `cn_live_${nanoid(32)}`;
}

/**
 * Hash an API key using SHA-256
 * This is what gets stored in the database
 */
export function hashAPIKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate an API key against the database
 * Returns the API key record if valid, null otherwise
 */
export async function validateAPIKey(
  apiKey: string
): Promise<APIKey | null> {
  try {
    const hashedKey = hashAPIKey(apiKey);

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .select('*')
      .eq('key', hashedKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    const keyData = data as any;

    // Check if the key has expired
    if (keyData.expires_at) {
      const expiryDate = new Date(keyData.expires_at);
      if (expiryDate < new Date()) {
        return null; // Key has expired
      }
    }

    return keyData as APIKey;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

/**
 * Create a new API key in the database
 * Returns both the plain key (to give to client) and the database record
 */
export async function createAPIKey(
  clientName: string,
  tier: string = 'basic',
  expiresAt?: Date
): Promise<{ plainKey: string; record: APIKey } | null> {
  try {
    const plainKey = generateAPIKey();
    const hashedKey = hashAPIKey(plainKey);

    const { data, error } = await (supabaseAdmin as any)
      .from('api_keys')
      .insert({
        key: hashedKey,
        client_name: clientName,
        tier: tier,
        is_active: true,
        expires_at: expiresAt?.toISOString() || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating API key:', error);
      return null;
    }

    return {
      plainKey,
      record: data as APIKey,
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
}

/**
 * Revoke an API key (set is_active to false)
 */
export async function revokeAPIKey(apiKeyId: string): Promise<boolean> {
  try {
    const { error} = await (supabaseAdmin as any)
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', apiKeyId);

    return !error;
  } catch (error) {
    console.error('Error revoking API key:', error);
    return false;
  }
}

/**
 * Get API key information by ID
 */
export async function getAPIKeyById(apiKeyId: string): Promise<APIKey | null> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from('api_keys')
      .select('*')
      .eq('id', apiKeyId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as APIKey;
  } catch (error) {
    console.error('Error fetching API key:', error);
    return null;
  }
}
