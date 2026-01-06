#!/usr/bin/env tsx

/**
 * Script to import CN database from CSV files
 * Usage: npm run import:data
 *
 * This script will:
 * 1. Read CSV files from cn-assets/
 * 2. Parse product descriptions, nutrition values, and nutrient descriptions
 * 3. Combine data into the cn_products table structure
 * 4. Import into Supabase
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { supabaseAdmin } from '../lib/supabase';

interface ProductRow {
  'Food category code': string;
  'Descriptor': string;
  'Abbreviated descriptor': string;
  'Cn code': string;
  'Gtin': string;
  'Product code': string;
  'Brand owner name': string;
  'Brand name': string;
  'FNS Material Number': string;
  'Source code': string;
  'Date added': string;
  'Last modified': string;
  'Discontinued date': string;
  'Form of food': string;
  'Fdc id': string;
  'Gpc product code': string;
}

interface NutrientValueRow {
  'Cn Code': string;
  'Nutrient code': string;
  'Nutrient value': string;
  'Per unit': string;
  'Value type code': string;
  'Source code': string;
  'Date added': string;
  'Last modified': string;
}

interface NutrientDescriptionRow {
  'Nutrient code': string;
  'Nutrient description': string;
  'Nutrient description abbrev': string;
  'Nutrient unit': string;
  'Date added': string;
  'Last modified': string;
}

interface CategoryRow {
  'Food category code': string;
  'Food category description': string;
}

const ASSETS_DIR = path.join(process.cwd(), 'cn-assets');
const BATCH_SIZE = 100; // Insert in batches to avoid timeout

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  CN Database Import Script');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Step 1: Read CSV files
    console.log('📁 Reading CSV files...\n');

    const fdesPath = path.join(ASSETS_DIR, 'CN.2025.11_FDES.csv');
    const nutvalPath = path.join(ASSETS_DIR, 'CN.2025.11_NUTVAL.csv');
    const nutdesPath = path.join(ASSETS_DIR, 'CN.2025.11_NUTDES.csv');
    const categoryPath = path.join(ASSETS_DIR, 'CN.2025.11_CTGNME.csv');

    const fdesContent = fs.readFileSync(fdesPath, 'utf-8');
    const nutvalContent = fs.readFileSync(nutvalPath, 'utf-8');
    const nutdesContent = fs.readFileSync(nutdesPath, 'utf-8');

    let categoryContent = '';
    let categories: CategoryRow[] = [];
    if (fs.existsSync(categoryPath)) {
      categoryContent = fs.readFileSync(categoryPath, 'utf-8');
      categories = parse(categoryContent, {
        columns: true,
        skip_empty_lines: true,
      });
      console.log(`✅ Loaded ${categories.length} categories`);
    }

    // Step 2: Parse CSV data
    console.log('\n📊 Parsing CSV data...\n');

    const products: ProductRow[] = parse(fdesContent, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log(`✅ Loaded ${products.length} products`);

    const nutritionValues: NutrientValueRow[] = parse(nutvalContent, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log(`✅ Loaded ${nutritionValues.length} nutrition values`);

    const nutrientDescriptions: NutrientDescriptionRow[] = parse(nutdesContent, {
      columns: true,
      skip_empty_lines: true,
    });
    console.log(`✅ Loaded ${nutrientDescriptions.length} nutrient descriptions`);

    // Step 3: Build nutrient lookup map
    const nutrientMap = new Map<string, NutrientDescriptionRow>();
    nutrientDescriptions.forEach((nutrient) => {
      nutrientMap.set(nutrient['Nutrient code'], nutrient);
    });

    // Build category lookup map
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat['Food category code'], cat['Food category description']);
    });

    // Step 4: Group nutrition values by CN code
    console.log('\n🔄 Processing nutrition data...\n');
    const nutritionByProduct = new Map<string, Record<string, number>>();

    nutritionValues.forEach((row) => {
      const cnCode = row['Cn Code'];
      const nutrientCode = row['Nutrient code'];
      const value = parseFloat(row['Nutrient value']);

      if (!nutritionByProduct.has(cnCode)) {
        nutritionByProduct.set(cnCode, {});
      }

      const nutrient = nutrientMap.get(nutrientCode);
      if (nutrient && !isNaN(value)) {
        const nutrientName = nutrient['Nutrient description abbrev'].toLowerCase().replace(/\s+/g, '_');
        nutritionByProduct.get(cnCode)![nutrientName] = value;
      }
    });

    console.log(`✅ Processed nutrition data for ${nutritionByProduct.size} products`);

    // Step 5: Build final product data
    console.log('\n🔄 Building product records...\n');

    const productRecords = products.map((product) => {
      const cnCode = product['Cn code'];
      const categoryCode = product['Food category code'];
      const nutritionData = nutritionByProduct.get(cnCode) || {};

      return {
        cn_number: cnCode,
        product_name: product['Descriptor'] || product['Abbreviated descriptor'],
        category: categoryMap.get(categoryCode) || `Category ${categoryCode}`,
        manufacturer: product['Brand owner name'] || null,
        serving_size: '100g', // Default serving size from the CSV structure
        nutrition_data: Object.keys(nutritionData).length > 0 ? nutritionData : null,
        metadata: {
          brand_name: product['Brand name'] || null,
          gtin: product['Gtin'] || null,
          product_code: product['Product code'] || null,
          fns_material_number: product['FNS Material Number'] || null,
          form_of_food: product['Form of food'] || null,
          date_added: product['Date added'] || null,
          last_modified: product['Last modified'] || null,
          discontinued_date: product['Discontinued date'] || null,
        },
      };
    });

    console.log(`✅ Built ${productRecords.length} product records`);

    // Step 6: Insert into Supabase in batches
    console.log('\n💾 Importing to Supabase...\n');
    console.log(`   Inserting ${productRecords.length} products in batches of ${BATCH_SIZE}...`);

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < productRecords.length; i += BATCH_SIZE) {
      const batch = productRecords.slice(i, i + BATCH_SIZE);

      const { data, error } = await (supabaseAdmin as any)
        .from('cn_products')
        .insert(batch)
        .select();

      if (error) {
        console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
        failed += batch.length;
      } else {
        imported += data?.length || 0;
        process.stdout.write(`   ✅ Imported ${imported}/${productRecords.length} products...\r`);
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n\n═══════════════════════════════════════════');
    console.log('  Import Complete!');
    console.log('═══════════════════════════════════════════\n');
    console.log(`✅ Successfully imported: ${imported} products`);
    if (failed > 0) {
      console.log(`❌ Failed to import: ${failed} products`);
    }
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error during import:', error);
    process.exit(1);
  }
}

main();
