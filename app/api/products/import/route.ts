import { NextRequest, NextResponse } from 'next/server'
import { createManyProducts } from '@/lib/server/products'
import { Product } from '@/types/product'
import { generateFakeProducts } from '@/lib/fake-data'
import { Store, Category } from '@/types/product'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let productsToCreate: Omit<Product, 'id'>[] = []

    // Option 1: Accept products array directly
    if (Array.isArray(body.products)) {
      productsToCreate = body.products.map((p: any) => {
        const { id, ...rest } = p
        return rest
      })
    }
    // Option 2: Generate from store/category/count params
    else if (body.store && body.category && body.count) {
      const fakeProducts = generateFakeProducts(
        body.store as Store,
        body.category as Category,
        body.count as number
      )
      productsToCreate = fakeProducts.map((p) => {
        const { id, ...rest } = p
        return rest
      })
    }
    else {
      return NextResponse.json(
        { error: 'Either provide products array or store/category/count params' },
        { status: 400 }
      )
    }

    if (productsToCreate.length === 0) {
      return NextResponse.json(
        { error: 'No products to import' },
        { status: 400 }
      )
    }

    // Deduplicate by slug or sourceUrl
    // First, check existing products to avoid duplicates
    const db = await (await import('@/lib/mongodb')).getMongoDb()
    const collection = db.collection('products')
    
    // Get existing slugs and sourceUrls
    const existing = await collection.find({
      $or: [
        { slug: { $in: productsToCreate.map((p: any) => p.slug).filter(Boolean) } },
        { sourceUrl: { $in: productsToCreate.map((p: any) => p.sourceUrl).filter(Boolean) } }
      ]
    }).toArray()
    
    const existingSlugs = new Set(existing.map((d: any) => d.slug).filter(Boolean))
    const existingSourceUrls = new Set(existing.map((d: any) => d.sourceUrl).filter(Boolean))
    
    // Filter out duplicates
    const uniqueProducts = productsToCreate.filter((p: any) => {
      const hasSlug = p.slug && existingSlugs.has(p.slug)
      const hasSourceUrl = p.sourceUrl && existingSourceUrls.has(p.sourceUrl)
      return !hasSlug && !hasSourceUrl
    })

    if (uniqueProducts.length === 0) {
      return NextResponse.json(
        { 
          message: 'All products already exist',
          created: [],
          skipped: productsToCreate.length
        },
        { status: 200 }
      )
    }

    // Create products
    const created = await createManyProducts(uniqueProducts)

    return NextResponse.json({
      message: `Created ${created.length} products, skipped ${productsToCreate.length - uniqueProducts.length} duplicates`,
      created: created.map((p) => p.id),
      skipped: productsToCreate.length - uniqueProducts.length
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error importing products:', error)
    return NextResponse.json(
      {
        error: 'Failed to import products',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

