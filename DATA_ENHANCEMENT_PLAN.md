# CN Database - Complete Data Import Plan

## 🎯 **OBJECTIVE**
Import ALL CN database files with proper structure and relationships.

---

## 📊 **CURRENT STATE vs. TARGET STATE**

### Current Database (Incomplete):
```
cn_products
  ├─ Basic product info ✅
  ├─ Nutrition data (JSONB) ✅
  ├─ Category CODE only ❌ (shows "Category 1" not "Dairy")
  ├─ NO weight conversions ❌
  └─ NO GPC classifications ❌
```

### Target Database (Complete):
```
cn_products (enhanced)
  ├─ Full product info ✅
  ├─ Category NAMES ✅
  ├─ GPC classification ✅
  ├─ Nutrition data (JSONB) ✅
  └─ Links to servings table ✅

cn_servings (NEW TABLE)
  └─ Weight/serving conversions ✅
```

---

## 🗂️ **DATABASE SCHEMA CHANGES NEEDED**

### 1. Add New Table: `cn_servings`
```sql
CREATE TABLE cn_servings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cn_number TEXT NOT NULL,
  sequence_num INTEGER,
  amount DECIMAL,
  measure_description TEXT,
  unit_amount DECIMAL,
  type_of_unit TEXT,
  source_code TEXT,
  date_added TEXT,
  last_modified TEXT,
  CONSTRAINT fk_cn_product FOREIGN KEY (cn_number)
    REFERENCES cn_products(cn_number) ON DELETE CASCADE
);

CREATE INDEX idx_cn_servings_cn_number ON cn_servings(cn_number);
```

### 2. Enhance `cn_products` Table
Add columns:
```sql
ALTER TABLE cn_products
  ADD COLUMN gpc_code TEXT,
  ADD COLUMN gpc_description TEXT;
```

Update existing data:
- Replace category codes with actual category names
- Add GPC classifications

---

## 📋 **IMPLEMENTATION PLAN**

### **Phase 1: Database Schema Updates** (5 minutes)
**Actions:**
1. Create `cn_servings` table
2. Add GPC columns to `cn_products`
3. Create necessary indexes

**SQL Migration File:** `002_add_servings_and_gpc.sql`

---

### **Phase 2: Fix Category Names** (2 minutes)
**Problem:** Products show "Category 1" instead of "Dairy and Egg Products"

**Solution:**
Update existing products with proper category names from CTGNME.csv

**Steps:**
1. Create category lookup map
2. Update all products with correct category names
3. Verify: `SELECT DISTINCT category FROM cn_products LIMIT 10;`

**Expected Result:**
```
Before: "Category 1", "Category 2"
After:  "Dairy and Egg Products", "Spices and Herbs"
```

---

### **Phase 3: Import Weight/Serving Conversions** (3 minutes)
**Data:** 15,166 serving conversions from WGHT.csv

**Example Data:**
```
CN 1001 (Butter):
  - 1 pat (1" sq, 1/3" high) = 5g
  - 1 TBSP = 14.2g
  - 1 cup = 227g
```

**Steps:**
1. Parse WGHT.csv
2. Insert into `cn_servings` table
3. Link to products via cn_number

**API Enhancement:**
New endpoint: `GET /api/products/{cnNumber}/servings`

**Response:**
```json
{
  "cn_number": "1001",
  "product_name": "Butter, salted",
  "servings": [
    {
      "amount": 1,
      "measure": "pat (1\" sq, 1/3\" high)",
      "grams": 5
    },
    {
      "amount": 1,
      "measure": "TBSP",
      "grams": 14.2
    },
    {
      "amount": 1,
      "measure": "cup",
      "grams": 227
    }
  ]
}
```

---

### **Phase 4: Import GPC Classifications** (2 minutes)
**Data:** 131 GPC product classifications from GPCNME.csv

**Example:**
```
50101800 = "Nuts/Seeds - Prepared/Processed"
50102000 = "Fruit - Prepared/Processed"
```

**Steps:**
1. Create GPC lookup map from GPCNME.csv
2. Update products with GPC code and description
3. Add to API responses

**Enhanced Product Response:**
```json
{
  "cn_number": "1001",
  "product_name": "Butter, salted",
  "category": "Dairy and Egg Products",
  "gpc_code": "50192200",
  "gpc_description": "Dairy - Prepared/Preserved"
}
```

---

### **Phase 5: Enhanced Import Script** (15 minutes)
**Create:** `scripts/import-complete-cn-data.ts`

**Features:**
- ✅ Import ALL 6 CSV files
- ✅ Proper category name mapping
- ✅ GPC classification linking
- ✅ Weight/serving conversions
- ✅ Nutrition data (already working)
- ✅ Error handling and validation
- ✅ Progress reporting

---

### **Phase 6: New API Endpoints** (10 minutes)

#### 1. **GET /api/products/{cnNumber}/servings**
Returns serving size conversions

#### 2. **Enhanced existing endpoints**
Add GPC and proper category names to all responses

---

### **Phase 7: Data Validation** (5 minutes)
**Verify:**
```sql
-- Check servings imported
SELECT COUNT(*) FROM cn_servings;
-- Expected: 15,166

-- Check products have categories
SELECT COUNT(*) FROM cn_products WHERE category LIKE 'Category %';
-- Expected: 0

-- Check products have GPC
SELECT COUNT(*) FROM cn_products WHERE gpc_code IS NOT NULL;
-- Expected: ~9,000

-- Sample product with all data
SELECT * FROM cn_products WHERE cn_number = '1001';
```

---

### **Phase 8: Deploy Updates** (5 minutes)
1. Commit changes to git
2. Push to GitHub
3. Vercel auto-deploys
4. Test production API

---

## 📊 **FINAL DATABASE STRUCTURE**

```
TABLES:
├─ cn_products (9,097 rows)
│    ├─ cn_number (PK)
│    ├─ product_name
│    ├─ category ← "Dairy and Egg Products" (FIXED)
│    ├─ gpc_code ← "50192200" (NEW)
│    ├─ gpc_description ← "Dairy - Prepared/Preserved" (NEW)
│    ├─ manufacturer
│    ├─ nutrition_data (JSONB with 19 nutrients)
│    └─ metadata (JSONB)
│
├─ cn_servings (15,166 rows) ← NEW TABLE
│    ├─ cn_number (FK → cn_products)
│    ├─ measure_description ("1 TBSP", "1 cup")
│    ├─ unit_amount (14.2, 227)
│    ├─ type_of_unit ("g")
│    └─ sequence_num
│
├─ api_keys
├─ billing_tiers
├─ api_usage
└─ monthly_usage_summary
```

---

## 🎯 **SUCCESS METRICS**

### Before Enhancement:
- ❌ Categories: "Category 1", "Category 2"
- ❌ No serving conversions
- ❌ No GPC classifications
- ⚠️  Limited API functionality

### After Enhancement:
- ✅ Categories: "Dairy and Egg Products", "Spices and Herbs"
- ✅ 15,166 serving conversions
- ✅ 131 GPC classifications mapped
- ✅ Enhanced API with serving sizes
- ✅ Professional-grade nutrition database

---

## ⏱️ **ESTIMATED TIMELINE**

| Phase | Task | Time |
|-------|------|------|
| 1 | Database schema updates | 5 min |
| 2 | Fix category names | 2 min |
| 3 | Import servings data | 3 min |
| 4 | Import GPC data | 2 min |
| 5 | Enhanced import script | 15 min |
| 6 | New API endpoints | 10 min |
| 7 | Data validation | 5 min |
| 8 | Deploy to production | 5 min |
| **TOTAL** | **Complete implementation** | **~45 min** |

---

## 🚀 **NEXT STEPS**

**Ready to proceed?**

I will:
1. ✅ Create new database migration
2. ✅ Update import script to handle ALL files
3. ✅ Fix category name mapping
4. ✅ Import weight/serving conversions
5. ✅ Import GPC classifications
6. ✅ Add new API endpoint for servings
7. ✅ Re-import data with complete information
8. ✅ Deploy to production

**This will give you a complete, professional-grade CN nutrition database API!**
