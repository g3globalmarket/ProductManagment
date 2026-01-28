import { NextRequest, NextResponse } from 'next/server'
import { getProductById, updateProductById } from '@/lib/server/products'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await getProductById(params.id)
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product, { status: 200 })
  } catch (error: any) {
    console.error('Error getting product:', error)
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }

    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to get product',
        ...(isDev && { details: error?.message ?? String(error) }),
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Minimal validation
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Remove id from body if present (shouldn't be updated)
    const { id, ...patch } = body

    // Check for blocked storefront fields and warn
    const BLOCKED_FIELDS = [
      'status',
      'shopId',
      'sale_price',
      'regular_price',
      'stock',
      'ratings',
      'totalSales',
      'createdAt',
      'updatedAt',
      '_id',
      'slug'
    ]
    const blockedFields = Object.keys(patch).filter(key => BLOCKED_FIELDS.includes(key))
    
    if (blockedFields.length > 0) {
      // Log warning but continue (fields will be silently ignored in updateProductById)
      console.warn(
        `[API] Attempted to update blocked storefront fields: ${blockedFields.join(', ')}. ` +
        `These fields are managed by the ecommerce app and will be ignored.`
      )
    }

    const product = await updateProductById(params.id, patch)
    
    // Return product with warning in response if blocked fields were present
    const response: any = product
    if (blockedFields.length > 0 && process.env.NODE_ENV === 'development') {
      response._warnings = {
        blockedFields,
        message: 'These storefront fields were ignored (managed by ecommerce app)'
      }
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error?.stack) {
      console.error('Stack trace:', error.stack)
    }
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to update product',
        ...(isDev && { details: error?.message ?? String(error) }),
      },
      { status: 500 }
    )
  }
}

