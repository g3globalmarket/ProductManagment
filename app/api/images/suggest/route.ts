import { NextRequest, NextResponse } from 'next/server'
import { getProductById } from '@/lib/server/products'
import { buildEnglishImageQuery } from '@/lib/server/geminiImageQuery'
import { searchImages } from '@/lib/server/googleImageSearch'

export const runtime = 'nodejs'

/**
 * GET /api/images/suggest
 * 
 * Suggests images for a product using Google Custom Search.
 * 
 * Query params:
 * - productId: Product ID to get info from (optional if q is provided)
 * - count: Number of images to return (default: 12, max: 10 per request)
 * - start: Start index for pagination (default: 1)
 * - q: Manual search query override (optional)
 * 
 * Returns:
 * {
 *   queryEn: string,
 *   urls: string[],
 *   count: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Check if image search is enabled
    if (process.env.IMAGE_SEARCH_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'Image search is not enabled. Set IMAGE_SEARCH_ENABLED=true in environment variables.' },
        { status: 400 }
      )
    }

    // Validate required environment variables
    const googleApiKey = process.env.GOOGLE_CLOUD_API_KEY
    const customSearchId = process.env.CUSTOM_SEARCH_ENGINE_ID

    if (!googleApiKey || !customSearchId) {
      return NextResponse.json(
        { error: 'Google Custom Search API credentials not configured. Set GOOGLE_CLOUD_API_KEY and CUSTOM_SEARCH_ENGINE_ID.' },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')
    const countParam = searchParams.get('count')
    const startParam = searchParams.get('start')
    const manualQuery = searchParams.get('q')

    const count = countParam ? Math.min(Math.max(1, parseInt(countParam, 10)), 30) : 10
    const start = startParam ? Math.max(1, parseInt(startParam, 10)) : 1

    let queryEnBase: string
    let queryEnFinal: string
    let querySource: string

    // Determine query: use manual query if provided, otherwise fetch from product
    if (manualQuery && manualQuery.trim()) {
      // User provided manual query - still run through Gemini to get English version
      const result = await buildEnglishImageQuery({ title: manualQuery })
      queryEnBase = result.queryEnBase
      queryEnFinal = result.queryEnFinal
      querySource = 'manual'
    } else if (productId) {
      // Fetch product from database
      const product = await getProductById(productId)

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        )
      }

      // Build query from product info
      // Priority: nameOriginal (KR source) > title > nameMn
      const title = product.nameOriginal || product.title || product.nameMn || ''
      const brand = product.brand || ''
      const store = product.sourceStore || ''
      const category = product.category || ''

      const result = await buildEnglishImageQuery({
        title,
        brand,
        store,
        category,
      })

      queryEnBase = result.queryEnBase
      queryEnFinal = result.queryEnFinal
      querySource = 'product'
    } else {
      return NextResponse.json(
        { error: 'Either productId or q (query) parameter is required' },
        { status: 400 }
      )
    }

    // Validate query
    if (!queryEnFinal || queryEnFinal.trim().length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate search query' },
        { status: 500 }
      )
    }

    // Search images with batching support for count > 10
    const imageUrls: string[] = []
    let remaining = count
    let currentStart = start
    const seenUrls = new Set<string>()

    while (remaining > 0 && imageUrls.length < 30) {
      const num = Math.min(10, remaining) // Google API max is 10 per request
      
      const pageUrls = await searchImages({
        query: queryEnFinal,
        num,
        start: currentStart,
        rights: process.env.IMAGE_SEARCH_RIGHTS || undefined,
      })

      // Add unique URLs
      for (const url of pageUrls) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url)
          imageUrls.push(url)
          if (imageUrls.length >= count) break
        }
      }

      // If we got fewer results than requested, we've reached the end
      if (pageUrls.length < num) {
        break
      }

      remaining = count - imageUrls.length
      currentStart += 10
    }

    return NextResponse.json({
      queryEnBase,
      queryEnFinal,
      urls: imageUrls.slice(0, count),
      count: imageUrls.length,
      source: querySource,
    }, { status: 200 })
  } catch (error: any) {
    console.error('Error in /api/images/suggest:', error)
    return NextResponse.json(
      {
        error: 'Failed to suggest images',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

