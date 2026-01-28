#!/usr/bin/env node

/**
 * Gmarket Product & Image Import Script
 * 
 * Safely imports products and images from JSON files into MongoDB.
 * - Default: dry-run mode (validation only, no DB writes)
 * - Use --apply flag to enable database writes
 * - Idempotent: upserts products by slug, re-attaches images correctly
 */

// Load environment variables from .env.local (must be before other imports)
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file (Next.js convention)
const envPath = resolve(process.cwd(), '.env.local')
config({ path: envPath })

// Also try .env as fallback
if (!process.env.MONGODB_URI) {
  config({ path: resolve(process.cwd(), '.env') })
}

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { ObjectId } from 'mongodb'
import { getMongoDb } from '../lib/mongodb'

// CLI Arguments
interface Args {
  products: string
  images: string
  dryRun: boolean
  apply: boolean
  concurrency: number
}

// Validation Results
interface ValidationError {
  index: number
  field: string
  message: string
}

interface ProductValidation {
  valid: any[]
  skipped: any[]
  errors: ValidationError[]
  slugDuplicates: string[]
  enumNormalizations: { field: string; old: string; new: string }[]
}

interface ImageValidation {
  valid: any[]
  skipped: any[]
  errors: ValidationError[]
}

interface DryRunReport {
  products: {
    total: number
    valid: number
    skipped: number
    slugDuplicates: string[]
    enumNormalizations: number
    errors: ValidationError[]
  }
  images: {
    total: number
    valid: number
    skipped: number
    errors: ValidationError[]
  }
}

interface ApplyReport {
  products: {
    created: number
    updated: number
    failed: number
  }
  images: {
    deleted: number
    created: number
    failed: number
  }
  elapsedMs: number
}

// Parse CLI arguments
function parseArgs(): Args {
  const args: Args = {
    products: './gmarket1.products.createMany.enriched2.json',
    images: './gmarket1.images.createMany.enriched2.json',
    dryRun: true,
    apply: false,
    concurrency: 10,
  }

  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--products' && argv[i + 1]) {
      args.products = argv[++i]
    } else if (arg === '--images' && argv[i + 1]) {
      args.images = argv[++i]
    } else if (arg === '--dry-run') {
      args.dryRun = true
      args.apply = false
    } else if (arg === '--apply') {
      args.apply = true
      args.dryRun = false
    } else if (arg === '--concurrency' && argv[i + 1]) {
      args.concurrency = parseInt(argv[++i], 10) || 10
    }
  }

  return args
}

// Check if string is valid MongoDB ObjectId (24 hex characters)
function isValidObjectId(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s)
}

// Normalize status enum value
function normalizeStatus(value: any): 'Active' | 'Pending' | 'Draft' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (normalized === 'Active' || normalized === 'ACTIVE' || normalized === 'active') return 'Active'
  if (normalized === 'Pending' || normalized === 'PENDING' || normalized === 'pending') return 'Pending'
  if (normalized === 'Draft' || normalized === 'DRAFT' || normalized === 'draft') return 'Draft'
  return null
}

// Normalize lifecycleStatus enum value
function normalizeLifecycleStatus(value: any): 'RAW' | 'DRAFT' | 'READY' | 'PUSHED' | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized === 'RAW') return 'RAW'
  if (normalized === 'DRAFT') return 'DRAFT'
  if (normalized === 'READY') return 'READY'
  if (normalized === 'PUSHED') return 'PUSHED'
  return null
}

// Generate stable file_id from URL
function generateFileId(url: string): string {
  // Simple hash-like function for stable ID
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `ext_${Math.abs(hash).toString(16).padStart(12, '0')}`
}

// Validate and normalize a product
function validateProduct(p: any, index: number, seenSlugs: Set<string>): {
  valid: any | null
  error: ValidationError | null
  isDuplicate: boolean
  enumNormalizations: { field: string; old: string; new: string }[]
} {
  const errors: string[] = []
  const enumNormalizations: { field: string; old: string; new: string }[] = []
  const normalized: any = { ...p }

  // title: non-empty string
  if (!p.title || typeof p.title !== 'string' || p.title.trim() === '') {
    errors.push('title must be a non-empty string')
  }

  // slug: non-empty string
  if (!p.slug || typeof p.slug !== 'string' || p.slug.trim() === '') {
    errors.push('slug must be a non-empty string')
    return { valid: null, error: { index, field: 'slug', message: 'slug is required' }, isDuplicate: false, enumNormalizations: [] }
  }

  // Check for duplicate slug
  const slug = p.slug.trim()
  const isDuplicate = seenSlugs.has(slug)
  if (isDuplicate) {
    return { valid: null, error: { index, field: 'slug', message: `duplicate slug: ${slug}` }, isDuplicate: true, enumNormalizations: [] }
  }
  seenSlugs.add(slug)
  normalized.slug = slug

  // status: normalize enum
  if (p.status !== undefined) {
    const normalizedStatus = normalizeStatus(p.status)
    if (normalizedStatus) {
      if (p.status !== normalizedStatus) {
        enumNormalizations.push({ field: 'status', old: p.status, new: normalizedStatus })
      }
      normalized.status = normalizedStatus
    } else {
      errors.push(`status must be one of: Active, Pending, Draft (got: ${p.status})`)
    }
  } else {
    normalized.status = 'Draft' // Default
  }

  // lifecycleStatus: normalize enum
  if (p.lifecycleStatus !== undefined) {
    const normalizedLifecycle = normalizeLifecycleStatus(p.lifecycleStatus)
    if (normalizedLifecycle) {
      if (p.lifecycleStatus !== normalizedLifecycle) {
        enumNormalizations.push({ field: 'lifecycleStatus', old: p.lifecycleStatus, new: normalizedLifecycle })
      }
      normalized.lifecycleStatus = normalizedLifecycle
    } else {
      errors.push(`lifecycleStatus must be one of: RAW, DRAFT, READY, PUSHED (got: ${p.lifecycleStatus})`)
    }
  } else {
    normalized.lifecycleStatus = 'RAW' // Default
  }

  // regular_price and sale_price: must be numbers
  if (p.regular_price !== undefined) {
    const regularPrice = typeof p.regular_price === 'string' ? parseFloat(p.regular_price) : p.regular_price
    if (isNaN(regularPrice)) {
      errors.push(`regular_price must be a number (got: ${p.regular_price})`)
    } else {
      normalized.regular_price = regularPrice
    }
  }
  if (p.sale_price !== undefined) {
    const salePrice = typeof p.sale_price === 'string' ? parseFloat(p.sale_price) : p.sale_price
    if (isNaN(salePrice)) {
      errors.push(`sale_price must be a number (got: ${p.sale_price})`)
    } else {
      normalized.sale_price = salePrice
    }
  }

  // stock: integer >= 0 (default 0)
  if (p.stock !== undefined) {
    const stock = typeof p.stock === 'string' ? parseInt(p.stock, 10) : Math.floor(p.stock)
    if (isNaN(stock) || stock < 0) {
      normalized.stock = 0
    } else {
      normalized.stock = stock
    }
  } else {
    normalized.stock = 0
  }

  // tags/colors/sizes/discount_codes: string arrays (default [])
  normalized.tags = Array.isArray(p.tags) ? p.tags.filter((t: any) => typeof t === 'string') : []
  normalized.colors = Array.isArray(p.colors) ? p.colors.filter((c: any) => typeof c === 'string') : []
  normalized.sizes = Array.isArray(p.sizes) ? p.sizes.filter((s: any) => typeof s === 'string') : []
  normalized.discount_codes = Array.isArray(p.discount_codes) ? p.discount_codes.filter((d: any) => typeof d === 'string') : []

  // shopId/categoryId: valid ObjectId or null
  if (p.shopId !== undefined) {
    if (typeof p.shopId === 'string' && p.shopId.trim() !== '') {
      if (isValidObjectId(p.shopId)) {
        normalized.shopId = p.shopId
      } else {
        console.warn(`[Product ${index}] Invalid shopId ObjectId: ${p.shopId}, setting to null`)
        normalized.shopId = null
      }
    } else {
      normalized.shopId = null
    }
  }
  if (p.categoryId !== undefined) {
    if (typeof p.categoryId === 'string' && p.categoryId.trim() !== '') {
      if (isValidObjectId(p.categoryId)) {
        normalized.categoryId = p.categoryId
      } else {
        console.warn(`[Product ${index}] Invalid categoryId ObjectId: ${p.categoryId}, setting to null`)
        normalized.categoryId = null
      }
    } else {
      normalized.categoryId = null
    }
  }

  // id: valid ObjectId or generate new one
  if (p.id !== undefined) {
    if (typeof p.id === 'string' && isValidObjectId(p.id)) {
      normalized.id = p.id
    } else {
      // Generate new ObjectId
      normalized.id = new ObjectId().toHexString()
    }
  } else {
    normalized.id = new ObjectId().toHexString()
  }

  // Preserve oldId for mapping (from original id field)
  normalized.oldId = p.id || normalized.id

  if (errors.length > 0) {
    return {
      valid: null,
      error: { index, field: 'multiple', message: errors.join('; ') },
      isDuplicate: false,
      enumNormalizations: [],
    }
  }

  return { valid: normalized, error: null, isDuplicate: false, enumNormalizations }
}

// Validate products array
function validateProducts(products: any[]): ProductValidation {
  const valid: any[] = []
  const skipped: any[] = []
  const errors: ValidationError[] = []
  const slugDuplicates: string[] = []
  const allEnumNormalizations: { field: string; old: string; new: string }[] = []
  const seenSlugs = new Set<string>()

  for (let i = 0; i < products.length; i++) {
    const result = validateProduct(products[i], i, seenSlugs)
    if (result.valid) {
      valid.push(result.valid)
      allEnumNormalizations.push(...result.enumNormalizations)
    } else {
      skipped.push(products[i])
      if (result.error) {
        errors.push(result.error)
      }
      if (result.isDuplicate) {
        slugDuplicates.push(products[i].slug)
      }
    }
  }

  return { valid, skipped, errors, slugDuplicates, enumNormalizations: allEnumNormalizations }
}

// Validate and normalize an image
function validateImage(img: any, index: number): {
  valid: any | null
  error: ValidationError | null
} {
  // url: non-empty string
  if (!img.url || typeof img.url !== 'string' || img.url.trim() === '') {
    return { valid: null, error: { index, field: 'url', message: 'url must be a non-empty string' } }
  }

  // file_id: non-empty string (generate if missing)
  let fileId = img.file_id
  if (!fileId || typeof fileId !== 'string' || fileId.trim() === '') {
    fileId = generateFileId(img.url)
  }

  // productId: valid ObjectId string
  if (!img.productId || typeof img.productId !== 'string' || !isValidObjectId(img.productId)) {
    return { valid: null, error: { index, field: 'productId', message: `productId must be a valid ObjectId (got: ${img.productId})` } }
  }

  return {
    valid: {
      url: img.url.trim(),
      file_id: fileId.trim(),
      productId: img.productId.trim(),
      provider: img.provider || 'gmarket',
      sort: typeof img.sort === 'number' ? img.sort : 0,
    },
    error: null,
  }
}

// Validate images array
function validateImages(images: any[]): ImageValidation {
  const valid: any[] = []
  const skipped: any[] = []
  const errors: ValidationError[] = []

  for (let i = 0; i < images.length; i++) {
    const result = validateImage(images[i], i)
    if (result.valid) {
      valid.push(result.valid)
    } else {
      skipped.push(images[i])
      if (result.error) {
        errors.push(result.error)
      }
    }
  }

  return { valid, skipped, errors }
}

// Generate dry-run report
function generateDryRunReport(
  productValidation: ProductValidation,
  imageValidation: ImageValidation
): DryRunReport {
  return {
    products: {
      total: productValidation.valid.length + productValidation.skipped.length,
      valid: productValidation.valid.length,
      skipped: productValidation.skipped.length,
      slugDuplicates: productValidation.slugDuplicates,
      enumNormalizations: productValidation.enumNormalizations.length,
      errors: productValidation.errors.slice(0, 10), // Show up to 10 errors
    },
    images: {
      total: imageValidation.valid.length + imageValidation.skipped.length,
      valid: imageValidation.valid.length,
      skipped: imageValidation.skipped.length,
      errors: imageValidation.errors.slice(0, 10), // Show up to 10 errors
    },
  }
}

// Print dry-run report
function printDryRunReport(report: DryRunReport, productValidation: ProductValidation, imageValidation: ImageValidation) {
  console.log('\n' + '='.repeat(80))
  console.log('📋 DRY-RUN VALIDATION REPORT')
  console.log('='.repeat(80))

  console.log('\n📦 PRODUCTS:')
  console.log(`  Total:        ${report.products.total}`)
  console.log(`  ✅ Valid:     ${report.products.valid}`)
  console.log(`  ⚠️  Skipped:   ${report.products.skipped}`)
  console.log(`  🔄 Duplicates: ${report.products.slugDuplicates.length} (slug duplicates)`)

  if (report.products.slugDuplicates.length > 0) {
    console.log(`\n  Duplicate slugs (first ${Math.min(5, report.products.slugDuplicates.length)}):`)
    report.products.slugDuplicates.slice(0, 5).forEach((slug, i) => {
      console.log(`    ${i + 1}. ${slug}`)
    })
    if (report.products.slugDuplicates.length > 5) {
      console.log(`    ... and ${report.products.slugDuplicates.length - 5} more`)
    }
  }

  console.log(`  🔧 Normalizations: ${report.products.enumNormalizations} (status/lifecycleStatus)`)
  
  if (productValidation.enumNormalizations.length > 0) {
    console.log(`\n  Enum normalizations (first ${Math.min(5, productValidation.enumNormalizations.length)}):`)
    productValidation.enumNormalizations.slice(0, 5).forEach((norm, i) => {
      console.log(`    ${i + 1}. ${norm.field}: "${norm.old}" → "${norm.new}"`)
    })
    if (productValidation.enumNormalizations.length > 5) {
      console.log(`    ... and ${productValidation.enumNormalizations.length - 5} more`)
    }
  }

  if (report.products.errors.length > 0) {
    console.log(`\n  ❌ Errors (showing ${report.products.errors.length} of ${productValidation.errors.length}):`)
    report.products.errors.forEach((err) => {
      console.log(`    [${err.index}] ${err.field}: ${err.message}`)
    })
  }

  console.log('\n🖼️  IMAGES:')
  console.log(`  Total:      ${report.images.total}`)
  console.log(`  ✅ Valid:   ${report.images.valid}`)
  console.log(`  ⚠️  Skipped: ${report.images.skipped}`)

  if (report.images.errors.length > 0) {
    console.log(`\n  ❌ Errors (showing ${report.images.errors.length} of ${imageValidation.errors.length}):`)
    report.images.errors.forEach((err) => {
      console.log(`    [${err.index}] ${err.field}: ${err.message}`)
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('💡 To apply changes, run with --apply flag')
  console.log('='.repeat(80) + '\n')
}

// Apply changes to database
async function applyChanges(
  validProducts: any[],
  validImages: any[]
): Promise<ApplyReport> {
  // Check environment variables before attempting DB connection
  if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
    const envPath = resolve(process.cwd(), '.env.local')
    const envExists = existsSync(envPath)
    throw new Error(
      `Missing MongoDB environment variables.\n` +
      `Required: MONGODB_URI and MONGODB_DB\n` +
      `Expected file: ${envPath}\n` +
      `File exists: ${envExists ? 'Yes' : 'No'}\n` +
      `Please create .env.local with:\n` +
      `  MONGODB_URI=your_connection_string\n` +
      `  MONGODB_DB=your_database_name`
    )
  }

  const startTime = Date.now()
  const db = await getMongoDb()
  const productsCollection = db.collection('products')
  const imagesCollection = db.collection('images')

  // Quick connectivity check
  await productsCollection.countDocuments()

  const report: ApplyReport = {
    products: { created: 0, updated: 0, failed: 0 },
    images: { deleted: 0, created: 0, failed: 0 },
    elapsedMs: 0,
  }

  // 1. Upsert products by slug
  console.log(`\n📦 Upserting ${validProducts.length} products...`)
  const oldIdToSlug = new Map<string, string>() // oldId -> slug mapping

  for (const product of validProducts) {
    try {
      const slug = product.slug
      oldIdToSlug.set(product.oldId, slug)

      // Prepare product document (exclude oldId from DB)
      const { oldId, id, ...productData } = product
      const now = new Date()
      
      // Upsert by slug
      const result = await productsCollection.findOneAndUpdate(
        { slug },
        {
          $set: {
            ...productData,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: id ? new ObjectId(id) : new ObjectId(),
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: 'after' }
      )

      if (result) {
        // Check if it was created or updated
        const existing = await productsCollection.findOne({ slug, createdAt: { $lt: now } })
        if (existing) {
          report.products.updated++
        } else {
          report.products.created++
        }
      }
    } catch (error: any) {
      console.error(`Failed to upsert product ${product.slug}:`, error.message)
      report.products.failed++
    }
  }

  // 2. Build oldId -> realDbId mapping using slug
  console.log(`\n🔗 Building product ID mapping...`)
  const slugs = Array.from(new Set(validProducts.map((p) => p.slug)))
  const dbProducts = await productsCollection.find({ slug: { $in: slugs } }).toArray()
  
  // Build mapping: oldId -> realDbId
  const oldIdToRealDbId = new Map<string, string>()
  for (const dbProduct of dbProducts) {
    const slug = dbProduct.slug
    const oldId = Array.from(oldIdToSlug.entries()).find(([_, s]) => s === slug)?.[0]
    if (oldId) {
      oldIdToRealDbId.set(oldId, dbProduct._id.toString())
    }
  }

  console.log(`  Mapped ${oldIdToRealDbId.size} products`)

  // 3. Rewrite image productIds and collect unique realDbIds
  console.log(`\n🖼️  Processing ${validImages.length} images...`)
  const rewrittenImages: any[] = []
  const realDbIdsForImages = new Set<string>()

  for (const image of validImages) {
    const realDbId = oldIdToRealDbId.get(image.productId)
    if (!realDbId) {
      console.warn(`  ⚠️  No mapping found for image productId: ${image.productId}, skipping`)
      report.images.failed++
      continue
    }

    rewrittenImages.push({
      ...image,
      productId: realDbId,
    })
    realDbIdsForImages.add(realDbId)
  }

  // 4. Delete existing images for imported products
  if (realDbIdsForImages.size > 0) {
    console.log(`  Deleting existing images for ${realDbIdsForImages.size} products...`)
    const deleteResult = await imagesCollection.deleteMany({
      productId: { $in: Array.from(realDbIdsForImages).map((id) => new ObjectId(id)) },
    })
    report.images.deleted = deleteResult.deletedCount || 0
  }

  // 5. Insert new images
  if (rewrittenImages.length > 0) {
    console.log(`  Inserting ${rewrittenImages.length} images...`)
    try {
      // Convert productId strings to ObjectIds for MongoDB
      const imagesToInsert = rewrittenImages.map((img) => ({
        ...img,
        productId: new ObjectId(img.productId),
      }))

      const insertResult = await imagesCollection.insertMany(imagesToInsert)
      report.images.created = insertResult.insertedCount || 0
    } catch (error: any) {
      console.error(`  Failed to insert images:`, error.message)
      report.images.failed += rewrittenImages.length
    }
  }

  report.elapsedMs = Date.now() - startTime
  return report
}

// Print apply report
function printApplyReport(report: ApplyReport) {
  console.log('\n' + '='.repeat(80))
  console.log('✅ APPLY REPORT')
  console.log('='.repeat(80))

  console.log('\n📦 PRODUCTS:')
  console.log(`  ✅ Created: ${report.products.created}`)
  console.log(`  🔄 Updated: ${report.products.updated}`)
  console.log(`  ❌ Failed:  ${report.products.failed}`)

  console.log('\n🖼️  IMAGES:')
  console.log(`  🗑️  Deleted: ${report.images.deleted}`)
  console.log(`  ✅ Created: ${report.images.created}`)
  console.log(`  ❌ Failed:  ${report.images.failed}`)

  console.log(`\n⏱️  Elapsed: ${(report.elapsedMs / 1000).toFixed(2)}s`)
  console.log('='.repeat(80) + '\n')
}

// Main function
async function main() {
  const args = parseArgs()

  console.log('🚀 Gmarket Import Script')
  console.log(`   Mode: ${args.apply ? 'APPLY (writing to DB)' : 'DRY-RUN (validation only)'}`)
  console.log(`   Products: ${args.products}`)
  console.log(`   Images: ${args.images}`)
  console.log(`   Concurrency: ${args.concurrency}`)

  // Load products JSON
  if (!existsSync(args.products)) {
    console.error(`❌ Products file not found: ${args.products}`)
    process.exit(1)
  }

  let products: any[] = []
  try {
    const productsContent = readFileSync(args.products, 'utf-8')
    products = JSON.parse(productsContent)
    if (!Array.isArray(products)) {
      console.error('❌ Products file must contain a JSON array')
      process.exit(1)
    }
  } catch (error: any) {
    console.error(`❌ Failed to load products file: ${error.message}`)
    process.exit(1)
  }

  // Load images JSON (optional)
  let images: any[] = []
  if (existsSync(args.images)) {
    try {
      const imagesContent = readFileSync(args.images, 'utf-8')
      images = JSON.parse(imagesContent)
      if (!Array.isArray(images)) {
        console.warn(`⚠️  Images file does not contain a JSON array, skipping images`)
      }
    } catch (error: any) {
      console.warn(`⚠️  Failed to load images file: ${error.message}, continuing without images`)
    }
  } else {
    console.warn(`⚠️  Images file not found: ${args.images}, continuing without images`)
  }

  // Validate products
  console.log(`\n📋 Validating ${products.length} products...`)
  const productValidation = validateProducts(products)

  // Validate images
  let imageValidation: ImageValidation = { valid: [], skipped: [], errors: [] }
  if (images.length > 0) {
    console.log(`📋 Validating ${images.length} images...`)
    imageValidation = validateImages(images)
  }

  // Generate and print dry-run report
  const dryRunReport = generateDryRunReport(productValidation, imageValidation)
  printDryRunReport(dryRunReport, productValidation, imageValidation)

  // Apply changes if --apply flag is set
  if (args.apply) {
    console.log('\n💾 APPLYING CHANGES TO DATABASE...\n')
    try {
      const applyReport = await applyChanges(productValidation.valid, imageValidation.valid)
      printApplyReport(applyReport)
    } catch (error: any) {
      console.error('\n❌ Failed to apply changes:', error.message)
      if (error.stack) {
        console.error('Stack trace:', error.stack)
      }
      process.exit(1)
    }
  } else {
    console.log('\n💡 Run with --apply to write changes to the database\n')
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

