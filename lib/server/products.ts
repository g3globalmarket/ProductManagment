import { ObjectId } from 'mongodb'
import { getMongoDb } from '../mongodb'
import { Product, ProductStatus } from '@/types/product'

// Convert MongoDB document (with _id) to Product (with id as string)
function docToProduct(doc: any): Product {
  const { _id, ...rest } = doc
  return {
    ...rest,
    id: _id.toString(),
  } as Product
}

// Convert Product (with id as string) to MongoDB document (with _id as ObjectId)
// Preserves original id field for slug-based lookups
function productToDoc(product: Partial<Product>): any {
  const { id, ...rest } = product
  const doc: any = { ...rest }
  if (id) {
    // Try to use as ObjectId if valid
    try {
      const objectId = new ObjectId(id)
      doc._id = objectId
      // Also preserve original id for slug-based lookups
      doc.id = id
    } catch {
      // Not a valid ObjectId (it's a slug), let MongoDB generate _id
      // Store original id as separate field for slug-based lookups
      doc.id = id
      // Don't set _id - MongoDB will auto-generate it
    }
  }
  return doc
}

// Check if string is a valid MongoDB ObjectId (24 hex characters)
function isObjectIdLike(s: string): boolean {
  return /^[a-f\d]{24}$/i.test(s)
}

// Build MongoDB selector for finding product by id or slug
// Tries ObjectId first, then falls back to slug field
function buildProductSelector(idOrSlug: string): any {
  if (isObjectIdLike(idOrSlug)) {
    // Valid ObjectId format - lookup by _id
    return { _id: new ObjectId(idOrSlug) }
  } else {
    // Not a valid ObjectId - lookup by slug field
    return { slug: idOrSlug }
  }
}

export async function listProducts(filters?: {
  lifecycleStatus?: ProductStatus
  store?: string
  visibility?: string
}): Promise<Product[]> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  const query: any = {}
  if (filters?.lifecycleStatus) {
    query.lifecycleStatus = filters.lifecycleStatus
  }
  if (filters?.store) {
    query.sourceStore = filters.store
  }
  if (filters?.visibility) {
    query.visibility = filters.visibility
  }

  const docs = await collection.find(query).toArray()
  return docs.map(docToProduct)
}

export async function getProductById(idOrSlug: string): Promise<Product | null> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  const selector = buildProductSelector(idOrSlug)
  const doc = await collection.findOne(selector)
  return doc ? docToProduct(doc) : null
}

// Whitelist of allowed fields for updates (import-tool only)
// These are fields that the import-tool is allowed to modify in a shared database
const ALLOWED_UPDATE_FIELDS = new Set([
  // Product content fields
  'nameMn',              // Mongolian name
  'nameOriginal',        // Original name from source
  'descriptionMn',      // Mongolian description
  'descriptionOriginal', // Original description from source
  'title',               // Product title (if used)
  'short_description',   // Short description
  'detailed_description', // Detailed description
  'category',            // Product category
  'subCategory',         // Sub-category
  'tags',                // Product tags
  'brand',               // Brand name
  'colors',              // Available colors
  'sizes',               // Available sizes
  'video_url',           // Product video URL
  'custom_specifications', // Custom specifications
  'custom_properties',   // Custom properties
  // Import pipeline fields
  'sourceStore',         // Source store identifier
  'sourceUrl',           // Source product URL
  'sourceProductId',     // Source product ID
  'importMeta',         // Import metadata
  'lifecycleStatus',     // Import tool lifecycle: RAW → DRAFT → READY → PUSHED
  'visibility',          // Visibility: public | hidden
  // Source change detection fields
  'sourceBaselinePriceKrw',
  'sourceLastCheckedPriceKrw',
  'sourceLastCheckedInStock',
  'sourceLastCheckedAt',
  'sourcePriceChanged',
  'sourceOutOfStock',
  // Image fields
  'images',              // Images metadata (if import-tool manages images)
  'imagesOriginal',      // Original images from source
  'imagesFinal',         // Final processed images
  // Price fields (import-tool can set initial prices)
  'priceKrw',            // Price in KRW
  'priceMnt',            // Price in MNT
  // Soft delete fields
  'isDeleted',           // Soft delete flag
  'deletedAt',           // Deletion timestamp
])

// Blocked fields that storefront (ecommerce) manages
// Import-tool MUST NOT modify these fields
const BLOCKED_STOREFRONT_FIELDS = new Set([
  'status',               // Storefront status: Active | Pending | Draft
  'shopId',              // Shop/merchant ID
  'sale_price',          // Sale price (storefront controlled)
  'regular_price',       // Regular price (storefront controlled)
  'stock',               // Stock quantity (storefront controlled)
  'ratings',             // Product ratings
  'totalSales',          // Total sales count
  'createdAt',           // Creation timestamp (managed by system)
  'updatedAt',           // Update timestamp (managed by system, we set it separately)
  '_id',                 // MongoDB ObjectId (immutable)
  'slug',                // Product slug (managed separately)
])

export async function updateProductById(
  idOrSlug: string,
  patch: Partial<Product>
): Promise<Product> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  const selector = buildProductSelector(idOrSlug)

  // Check for blocked storefront fields
  const blockedFields: string[] = []
  for (const key of Object.keys(patch)) {
    if (BLOCKED_STOREFRONT_FIELDS.has(key)) {
      blockedFields.push(key)
    }
  }

  // Whitelist allowed fields only (silently ignore blocked fields)
  // Only include fields that are defined (not undefined)
  const safeChanges: any = {}
  for (const [key, value] of Object.entries(patch)) {
    if (ALLOWED_UPDATE_FIELDS.has(key) && value !== undefined) {
      safeChanges[key] = value
    }
    // Blocked fields are silently ignored (not added to safeChanges)
  }

  // Never update id, _id, or slug (these are managed separately)
  delete safeChanges.id
  delete safeChanges._id
  delete safeChanges.slug

  // Always set updatedAt on update (but don't allow it in patch body)
  safeChanges.updatedAt = new Date()

  // Log warning if blocked fields were attempted
  if (blockedFields.length > 0) {
    console.warn(
      `[Import Tool] Attempted to update blocked storefront fields: ${blockedFields.join(', ')}. ` +
      `These fields are managed by the ecommerce app and were ignored.`
    )
  }

  const result = await collection.findOneAndUpdate(
    selector,
    { $set: safeChanges },
    { returnDocument: 'after' }
  )

  if (!result) {
    throw new Error(`Product not found: ${idOrSlug}`)
  }

  return docToProduct(result)
}

export async function updateManyStatus(
  ids: string[],
  lifecycleStatus: ProductStatus
): Promise<Product[]> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  // Build selectors for both ObjectId and slug lookups
  const selectors: any[] = []
  for (const id of ids) {
    selectors.push(buildProductSelector(id))
  }

  if (selectors.length === 0) {
    return []
  }

  // Use $or to match any of the selectors
  await collection.updateMany(
    { $or: selectors },
    { $set: { lifecycleStatus } }  // Update lifecycleStatus, not status
  )

  // Fetch updated documents
  const docs = await collection.find({ $or: selectors }).toArray()
  return docs.map(docToProduct)
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  const result = await collection.insertOne(productToDoc(product))
  const doc = await collection.findOne({ _id: result.insertedId })
  
  if (!doc) {
    throw new Error('Failed to create product')
  }

  return docToProduct(doc)
}

export async function createManyProducts(products: Omit<Product, 'id'>[]): Promise<Product[]> {
  const db = await getMongoDb()
  const collection = db.collection('products')

  const docs = products.map(productToDoc)
  const result = await collection.insertMany(docs)
  
  const insertedIds = Object.values(result.insertedIds)
  const insertedDocs = await collection.find({ _id: { $in: insertedIds } }).toArray()
  
  return insertedDocs.map(docToProduct)
}

