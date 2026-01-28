import { NextResponse } from 'next/server'
import { getMongoDb } from '@/lib/mongodb'

export async function POST() {
  // Protect: only allow in development with explicit flag
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Seed-one endpoint not available in production' },
      { status: 403 }
    )
  }

  if (process.env.ALLOW_DEV_SEED !== 'true') {
    return NextResponse.json(
      { error: 'Seed-one endpoint disabled. Set ALLOW_DEV_SEED=true to enable.' },
      { status: 403 }
    )
  }

  try {
    const db = await getMongoDb()
    const collection = db.collection('products')

    const slug = 'gmarket-777296524-tonymoly-green-tea-set'
    const now = new Date()

    // Ensure slug uniqueness: delete existing product with same slug (dev convenience)
    const existing = await collection.findOne({ slug })
    if (existing) {
      await collection.deleteOne({ slug })
      console.log(`[Seed-One] Deleted existing product with slug: ${slug}`)
    }

    // Product object with ONLY Mongolian text in human-visible fields
    // Compatible with Prisma Product model structure
    const product = {
      sourceStore: 'gmarket',
      sourceUrl: 'https://item.gmarket.co.kr/Item?goodscode=777296524',
      sourceProductId: '777296524',

      slug: slug,
      title: 'TONYMOLY Ногоон цайтай чийгшүүлэгч 2 иж бүрдэл (тонер 200мл+20мл / лосьон 200мл+20мл)',
      category: 'beauty',
      subCategory: 'skincare-set',

      short_description: 'Ногоон цайтай чийгшүүлэх иж бүрдэл: тонер ба лосьон, мини сав дагалдана.',
      detailed_description: 'Gmarket (goodscode: 777296524) бүтээгдэхүүн. Багцын бүрдэл: Тонер 200мл + 20мл, Лосьон 200мл + 20мл.',

      brand: 'TONYMOLY',
      tags: ['skincare', 'green-tea', 'toner', 'lotion', 'set'],
      colors: [],
      sizes: [],

      // Pricing/stock for Prisma compatibility (use numbers)
      stock: 10,
      regular_price: 33000,
      sale_price: 29040,

      // Keep these safe for shared DB
      lifecycleStatus: 'READY',      // import pipeline
      status: 'Draft',               // storefront (do not touch later in PATCH whitelist)

      // Prisma often expects custom_properties to exist
      custom_properties: {
        currency: 'KRW',
        source: { goodscode: '777296524' },
        imageUrls: [
          'https://gdimg.gmarket.co.kr/777296524/still/600?ver=1764051787'
        ]
      },

      createdAt: now,
      updatedAt: now
    }

    const result = await collection.insertOne(product)

    return NextResponse.json(
      {
        ok: true,
        insertedId: result.insertedId.toString(),
        slug: slug
      },
      { status: 200 }
    )
  } catch (error: any) {
    // Log full error with stack trace
    console.error('Error seeding one product:', error)
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }

    // Return detailed error only in development
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to seed one product',
        ...(isDev && { details: error?.message ?? String(error) }),
      },
      { status: 500 }
    )
  }
}

