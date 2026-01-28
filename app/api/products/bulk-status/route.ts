import { NextRequest, NextResponse } from 'next/server'
import { updateManyStatus } from '@/lib/server/products'
import { ProductStatus } from '@/types/product'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // Minimal validation
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const { ids, lifecycleStatus } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!lifecycleStatus || !['RAW', 'DRAFT', 'READY', 'PUSHED'].includes(lifecycleStatus)) {
      return NextResponse.json(
        { error: 'lifecycleStatus must be one of: RAW, DRAFT, READY, PUSHED' },
        { status: 400 }
      )
    }

    const products = await updateManyStatus(ids, lifecycleStatus as ProductStatus)
    return NextResponse.json(products, { status: 200 })
  } catch (error) {
    console.error('Error updating bulk status:', error)
    return NextResponse.json(
      { error: 'Failed to update bulk status' },
      { status: 500 }
    )
  }
}

