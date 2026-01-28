import { NextRequest, NextResponse } from 'next/server'
import { listProducts } from '@/lib/server/products'
import { ProductStatus } from '@/types/product'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lifecycleStatus = searchParams.get('lifecycleStatus') as ProductStatus | null
    const store = searchParams.get('store') || undefined
    const visibility = searchParams.get('visibility') || undefined

    const filters: any = {}
    if (lifecycleStatus && ['RAW', 'DRAFT', 'READY', 'PUSHED'].includes(lifecycleStatus)) {
      filters.lifecycleStatus = lifecycleStatus
    }
    if (store) {
      filters.store = store
    }
    if (visibility) {
      filters.visibility = visibility
    }

    const products = await listProducts(filters)
    return NextResponse.json(products, { status: 200 })
  } catch (error) {
    console.error('Error listing products:', error)
    return NextResponse.json(
      { error: 'Failed to list products' },
      { status: 500 }
    )
  }
}

