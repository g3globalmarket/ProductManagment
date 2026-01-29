/**
 * Google Custom Search API helper for image search
 * 
 * Searches Google Images using Custom Search API and returns image URLs.
 */

interface SearchImagesOptions {
  query: string
  num?: number // Max 10 per request
  start?: number // Start index (1-based)
  rights?: string // e.g., "cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived"
}

interface GoogleSearchResponse {
  items?: Array<{
    link?: string
    image?: {
      thumbnailLink?: string
      contextLink?: string
    }
  }>
  error?: {
    message?: string
    code?: number
  }
}

/**
 * Search images using Google Custom Search API
 * 
 * @param options - Search options
 * @returns Array of image URLs (http/https only)
 */
export async function searchImages({
  query,
  num = 10,
  start = 1,
  rights,
}: SearchImagesOptions): Promise<string[]> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  const cx = process.env.CUSTOM_SEARCH_ENGINE_ID

  if (!apiKey || !cx) {
    throw new Error('Google Custom Search API credentials not configured (GOOGLE_CLOUD_API_KEY, CUSTOM_SEARCH_ENGINE_ID)')
  }

  // Validate num (max 10 per request)
  const validNum = Math.min(Math.max(1, num), 10)
  const validStart = Math.max(1, start)

  // Build query parameters
  const params = new URLSearchParams({
    key: apiKey,
    cx: cx,
    q: query,
    searchType: 'image',
    num: validNum.toString(),
    start: validStart.toString(),
    safe: 'active', // Safe search
    imgType: 'photo', // Prefer photos over illustrations/diagrams
    imgSize: 'large', // Prefer larger images (better quality product photos)
    imgColorType: 'color', // Prefer color images
  })

  // Add rights filter if provided
  if (rights) {
    params.append('rights', rights)
  }

  const url = `https://www.googleapis.com/customsearch/v1?${params.toString()}`

  // Use AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google Custom Search API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: GoogleSearchResponse = await response.json()

    // Handle API errors
    if (data.error) {
      throw new Error(`Google Custom Search API error: ${data.error.code} - ${data.error.message || 'Unknown error'}`)
    }

    // Extract image URLs
    const imageUrls: string[] = []

    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        // Prefer image.link, fallback to image.thumbnailLink
        const imageUrl = item.link || item.image?.thumbnailLink || item.image?.contextLink

        if (imageUrl && typeof imageUrl === 'string') {
          // Only accept http/https URLs
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            imageUrls.push(imageUrl)
          }
        }
      }
    }

    return imageUrls
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      throw new Error('Image search request timed out after 10 seconds')
    }

    throw error
  }
}

