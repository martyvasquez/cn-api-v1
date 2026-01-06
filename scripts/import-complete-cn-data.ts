#!/usr/bin/env tsx

/**
 * COMPLETE CN Database Import Script
 *
 * This script imports ALL 6 CSV files:
 * 1. CTGNME - Categories (with proper names)
 * 2. GPCNME - GPC Classifications
 * 3. FDES - Food Descriptions
 * 4. NUTDES - Nutrient Descriptions
 * 5. NUTVAL - Nutrition Values
 * 6. WGHT - Weight/Serving Conversions
 */

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { supabaseAdmin } from '../lib/supabase';

const ASSETS_DIR = path.join(process.cwd(), 'cn-assets');
const BATCH_SIZE = 100;

interface CategoryRow {
  'Food category code': string;
  'Category description': string;
}

interface GPCRow {
  'Gpc code': string;
  'Gpc description': string;
}

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
}

interface NutrientDescriptionRow {
  'Nutrient code': string;
  'Nutrient description abbrev': string;
}

interface WeightRow {
  'Cn code': string;
  'Sequence num': string;
  'Amount': string;
  'Measure description': string;
  'Unit amount': string;
  'Type of unit': string;
  'Source code': string;
  'Date added': string;
  'Last modified': string;
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  COMPLETE CN Database Import');
  console.log('  Importing ALL 6 CSV files');
  console.log('═══════════════════════════════════════════\n');

  try {
    // ========================================
    // STEP 1: Read all CSV files
    // ========================================
    console.log('📁 Step 1: Reading CSV files...\n');

    const categories: CategoryRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_CTGNME.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ Categories: ${categories.length}`);

    const gpcCodes: GPCRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_GPCNME.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ GPC Classifications: ${gpcCodes.length}`);

    const products: ProductRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_FDES.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ Products: ${products.length}`);

    const nutrientDescriptions: NutrientDescriptionRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_NUTDES.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ Nutrient Descriptions: ${nutrientDescriptions.length}`);

    const nutritionValues: NutrientValueRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_NUTVAL.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ Nutrition Values: ${nutritionValues.length}`);

    const weights: WeightRow[] = parse(
      fs.readFileSync(path.join(ASSETS_DIR, 'CN.2025.11_WGHT.csv'), 'utf-8'),
      { columns: true, skip_empty_lines: true }
    );
    console.log(`  ✅ Weight Conversions: ${weights.length}\n`);

    // ========================================
    // STEP 2: Build lookup maps
    // ========================================
    console.log('🗺️  Step 2: Building lookup maps...\n');

    // Category lookup: code → name
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat['Food category code'], cat['Category description']);
    });
    console.log(`  ✅ Category map: ${categoryMap.size} categories`);

    // GPC lookup: code → description
    const gpcMap = new Map<string, string>();
    gpcCodes.forEach((gpc) => {
      gpcMap.set(gpc['Gpc code'], gpc['Gpc description']);
    });
    console.log(`  ✅ GPC map: ${gpcMap.size} classifications`);

    // Nutrient lookup: code → abbrev
    const nutrientMap = new Map<string, string>();
    nutrientDescriptions.forEach((nutrient) => {
      nutrientMap.set(
        nutrient['Nutrient code'],
        nutrient['Nutrient description abbrev'].toLowerCase().replace(/\s+/g, '_')
      );
    });
    console.log(`  ✅ Nutrient map: ${nutrientMap.size} nutrients\n`);

    // ========================================
    // STEP 3: Process nutrition data
    // ========================================
    console.log('🔄 Step 3: Processing nutrition data...\n');

    const nutritionByProduct = new Map<string, Record<string, number>>();
    nutritionValues.forEach((row) => {
      const cnCode = row['Cn Code'];
      const nutrientCode = row['Nutrient code'];
      const value = parseFloat(row['Nutrient value']);

      if (!nutritionByProduct.has(cnCode)) {
        nutritionByProduct.set(cnCode, {});
      }

      const nutrientName = nutrientMap.get(nutrientCode);
      if (nutrientName && !isNaN(value)) {
        nutritionByProduct.get(cnCode)![nutrientName] = value;
      }
    });
    console.log(`  ✅ Processed nutrition for ${nutritionByProduct.size} products\n`);

    // ========================================
    // STEP 4: Build product records with EVERYTHING
    // ========================================
    console.log('🏗️  Step 4: Building complete product records...\n');

    const productRecords = products.map((product) => {
      const cnCode = product['Cn code'];
      const categoryCode = product['Food category code'];
      const gpcCode = product['Gpc product code'];
      const nutritionData = nutritionByProduct.get(cnCode) || {};

      return {
        cn_number: cnCode,
        product_name: product['Descriptor'] || product['Abbreviated descriptor'],
        // FIX: Use category NAME, not code!
        category: categoryMap.get(categoryCode) || `Category ${categoryCode}`,
        manufacturer: product['Brand owner name'] || null,
        serving_size: '100g',
        nutrition_data: Object.keys(nutritionData).length > 0 ? nutritionData : null,
        // NEW: Add GPC classification
        gpc_code: gpcCode || null,
        gpc_description: gpcCode ? gpcMap.get(gpcCode) || null : null,
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

    console.log(`  ✅ Built ${productRecords.length} complete product records\n`);

    // ========================================
    // STEP 5: Clear existing data
    // ========================================
    console.log('🗑️  Step 5: Clearing existing data...\n');

    await (supabaseAdmin as any).from('cn_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log(`  ✅ Cleared existing products\n`);

    // ========================================
    // STEP 6: Import products
    // ========================================
    console.log('💾 Step 6: Importing products to database...\n');

    let imported = 0;
    for (let i = 0; i < productRecords.length; i += BATCH_SIZE) {
      const batch = productRecords.slice(i, i + BATCH_SIZE);

      const { data, error } = await (supabaseAdmin as any)
        .from('cn_products')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      } else {
        imported += data?.length || 0;
        process.stdout.write(`  ✅ Imported ${imported}/${productRecords.length} products...\r`);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`\n  ✅ Products import complete!\n`);

    // ========================================
    // STEP 7: Import weight/serving conversions
    // ========================================
    console.log('🍽️  Step 7: Importing serving conversions...\n');

    const servingRecords = weights.map((weight) => ({
      cn_number: weight['Cn code'],
      sequence_num: parseInt(weight['Sequence num']) || null,
      amount: parseFloat(weight['Amount']) || null,
      measure_description: weight['Measure description'],
      unit_amount: parseFloat(weight['Unit amount']) || null,
      type_of_unit: weight['Type of unit'],
      source_code: weight['Source code'] || null,
      date_added: weight['Date added'] || null,
      last_modified: weight['Last modified'] || null,
    }));

    let servingsImported = 0;
    for (let i = 0; i < servingRecords.length; i += BATCH_SIZE) {
      const batch = servingRecords.slice(i, i + BATCH_SIZE);

      const { data, error } = await (supabaseAdmin as any)
        .from('cn_servings')
        .insert(batch)
        .select();

      if (error) {
        console.error(`  ❌ Servings batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      } else {
        servingsImported += data?.length || 0;
        process.stdout.write(`  ✅ Imported ${servingsImported}/${servingRecords.length} servings...\r`);
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(`\n  ✅ Servings import complete!\n`);

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('  🎉 COMPLETE IMPORT FINISHED!');
    console.log('═══════════════════════════════════════════\n');
    console.log(`✅ Products imported: ${imported}`);
    console.log(`✅ Servings imported: ${servingsImported}`);
    console.log(`✅ Categories: ${categoryMap.size} (with proper names)`);
    console.log(`✅ GPC codes: ${gpcMap.size} classifications`);
    console.log(`✅ Nutrition data: ${nutritionByProduct.size} products`);
    console.log('\n🎯 Your database now has COMPLETE CN data!\n');

  } catch (error) {
    console.error('\n❌ Error during import:', error);
    process.exit(1);
  }
}

main();
