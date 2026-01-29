/**
 * Gemini API helper for building English image search queries
 * 
 * Uses Google Generative Language API (Gemini) to convert product information
 * (title, brand, etc.) into a clean English query optimized for Google Images search.
 */

interface BuildQueryInput {
  title?: string
  brand?: string
  store?: string
  category?: string
}

interface BuildQueryResult {
  queryEnBase: string // Clean query without negative terms (for UI display)
  queryEnFinal: string // Query with negative terms (for search)
  reason?: string
  method: 'gemini' | 'fallback' | 'gemini-translate'
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
  }>
  error?: {
    message?: string
    code?: number
  }
}

/**
 * Robust JSON extractor that handles various response formats
 * 
 * Tries multiple strategies to extract JSON from text that may contain
 * markdown, explanations, or other wrapper text.
 */
function extractJson(text: string): any | null {
  if (!text || typeof text !== 'string') return null

  const trimmed = text.trim()

  // Strategy 1: Direct JSON.parse
  try {
    return JSON.parse(trimmed)
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code fences ```json ... ```
  const jsonFenceMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i)
  if (jsonFenceMatch) {
    try {
      return JSON.parse(jsonFenceMatch[1])
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Find first '{' and last '}' and parse
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonCandidate = trimmed.slice(firstBrace, lastBrace + 1)
      return JSON.parse(jsonCandidate)
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Find first '[' and last ']' (for array responses, though we expect object)
  const firstBracket = trimmed.indexOf('[')
  const lastBracket = trimmed.lastIndexOf(']')
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try {
      const jsonCandidate = trimmed.slice(firstBracket, lastBracket + 1)
      return JSON.parse(jsonCandidate)
    } catch {
      // All strategies failed
    }
  }

  return null
}

/**
 * Check if text contains non-Latin characters (Hangul, Cyrillic, etc.)
 * indicating it's not English
 */
function containsNonLatinScript(text: string): boolean {
  // Check for Hangul (Korean), Cyrillic (Russian), CJK (Chinese/Japanese), Arabic, etc.
  const nonLatinPattern = /[\u0400-\u04FF\uAC00-\uD7AF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0600-\u06FF]/
  return nonLatinPattern.test(text)
}

/**
 * Check if a query is bad/invalid (too short, generic words, etc.)
 */
function isBadQuery(q: string, brand?: string): boolean {
  if (!q || typeof q !== 'string') return true
  
  const trimmed = q.trim().toLowerCase()
  
  // Too short
  if (trimmed.length < 8) return true
  
  // Generic words that indicate bad parsing
  const badStarts = ['here', 'this', 'json', 'response', 'result', 'query', 'output', 'the query is', 'query:', 'result:']
  if (badStarts.some(bad => trimmed === bad || trimmed.startsWith(bad + ' '))) return true
  
  // Almost no letters/numbers (mostly punctuation)
  const letterNumberCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length
  if (letterNumberCount < 5) return true
  
  // If brand exists but query doesn't contain brand or product keywords
  if (brand && brand.trim().length > 0) {
    const brandLower = brand.toLowerCase()
    const hasBrand = trimmed.includes(brandLower)
    // Check if it has product-like keywords (common product words)
    const productKeywords = ['ml', 'g', 'oz', 'pack', 'set', 'toner', 'serum', 'cream', 'lotion', 'product', 'item']
    const hasProductKeywords = productKeywords.some(kw => trimmed.includes(kw))
    
    // If no brand and no product keywords, it's likely bad
    if (!hasBrand && !hasProductKeywords) return true
  }
  
  return false
}

/**
 * Clean title by removing promotional text, brackets, etc.
 */
function cleanTitle(title: string): string {
  if (!title) return ''
  
  let cleaned = title.trim()
  
  // Remove bracketed content: [1월 올영픽/리뉴얼], (기획), etc.
  cleaned = cleaned.replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '')
  
  // Remove common Korean promotional terms
  const koreanPromos = ['올영픽', '리뉴얼', '기획', '더블', '세트', '증정', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  for (const promo of koreanPromos) {
    cleaned = cleaned.replace(new RegExp(promo, 'gi'), '')
  }
  
  // Remove extra punctuation and whitespace
  cleaned = cleaned.replace(/[^\w\s\-\.\/]/g, ' ').replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Extract English query from raw text by removing wrapper phrases
 */
function extractQueryFromText(text: string): string {
  if (!text) return ''

  let cleaned = text.trim()

  // Remove common wrapper phrases
  const wrapperPhrases = [
    /^Here is (the )?/i,
    /^JSON:/i,
    /^Response:/i,
    /^Output:/i,
    /^Result:/i,
    /^The query is:/i,
    /^Query:/i,
  ]

  for (const pattern of wrapperPhrases) {
    cleaned = cleaned.replace(pattern, '').trim()
  }

  // Remove markdown code fences
  cleaned = cleaned.replace(/```(?:json)?/gi, '').trim()

  // Remove quotes if the entire text is wrapped
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  // Find the longest line that contains letters/numbers
  const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length > 0) {
    const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b))
    // Check if it looks like a query (has letters/numbers, not just punctuation)
    if (/[a-zA-Z0-9]/.test(longestLine)) {
      return longestLine
    }
  }

  return cleaned
}

/**
 * Call Gemini for translation (lightweight, no JSON mode)
 */
async function translateToEnglish(
  text: string,
  geminiApiKey: string,
  geminiModel: string
): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Convert this product title (KR/MN/RU/mixed) into a short English Google Images query for product photos. Reply with ONE LINE only, no explanations.

Product: ${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 40,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`)
    }

    const data: GeminiResponse = await response.json()

    if (data.error) {
      throw new Error(`Translation API error: ${data.error.message || 'Unknown error'}`)
    }

    const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return translated || ''
  } catch (error) {
    // If translation fails, return empty to trigger final fallback
    return ''
  }
}

/**
 * Build an English image search query from product information
 * 
 * Uses Gemini API if available, otherwise falls back to simple concatenation.
 * 
 * @param input - Product information (title, brand, store, category)
 * @returns English query optimized for image search
 */
export async function buildEnglishImageQuery(
  input: BuildQueryInput
): Promise<BuildQueryResult> {
  const { title, brand, store, category } = input

  // Check if image search is enabled and Gemini API key is available
  const imageSearchEnabled = process.env.IMAGE_SEARCH_ENABLED === 'true'
  const geminiApiKey = process.env.GEMINI_API_KEY
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  // Fallback if Gemini is not available
  if (!imageSearchEnabled || !geminiApiKey) {
    const cleanedTitle = cleanTitle(title || '')
    const fallbackQueryBase = [brand, cleanedTitle].filter(Boolean).join(' ').trim() || 'product'
    const negativeTerms = '-json -schema -code -programming -api -database -tutorial -diagram -screenshot'
    const fallbackQueryFinal = `${fallbackQueryBase} ${negativeTerms}`.trim()
    return {
      queryEnBase: fallbackQueryBase,
      queryEnFinal: fallbackQueryFinal,
      method: 'fallback',
      reason: 'Gemini API not configured',
    }
  }

  try {
    // Build prompt for Gemini
    const promptParts: string[] = []
    
    if (title) {
      promptParts.push(`Product title: "${title}"`)
    }
    if (brand) {
      promptParts.push(`Brand: "${brand}"`)
    }
    if (store) {
      promptParts.push(`Store: "${store}"`)
    }
    if (category) {
      promptParts.push(`Category: "${category}"`)
    }

    const prompt = `Convert the following product information into a SHORT, clean English query for Google Images product photo search.

${promptParts.join('\n')}

Requirements:
- Output 5-12 words maximum (ideally 6-8 words)
- English only (translate from Korean/Mongolian/Russian if needed)
- Keep ONLY: brand name, key product line/name, product type, size (ml/g/oz), pack count if truly relevant
- Remove ALL promotional text: brackets, dates, campaign words, store promos
- Remove Korean terms: "올영픽", "리뉴얼", "기획", "더블", "세트", "증정", "1월", "2월", etc.
- Remove: shipping, sale, discount, authentic, original, free, promo, campaign, event
- Remove: store names, platform names (Gmarket, Olive Young, etc.)
- Normalize units: use "ml", "g", "oz", "pack" (not "250ml" → "250 ml" is fine)
- Focus on what the product IS, not marketing descriptions
- Think: "What would I search to find a photo of this product?"

Example transformations:
- "[1월 올영픽/리뉴얼] 아누아 어성초 77 히알루론 수분 진정 토너 250ml 더블 기획" → "anua heartleaf 77 soothing toner 250ml"
- "SK-II Facial Treatment Essence 230ml Authentic Original" → "sk2 facial treatment essence 230ml"
- "Laneige Water Bank Hyaluronic Serum 50ml 2-Pack Set" → "laneige water bank hyaluronic serum 50ml"`

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: 'Return ONLY valid JSON. No markdown, no explanations. Output must be valid JSON object with queryEn and optional reason fields.',
            },
          ],
        },
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 80, // Reduced for shorter queries (5-12 words)
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              queryEn: {
                type: 'string',
                description: 'English search query for Google Images',
              },
              reason: {
                type: 'string',
                description: 'Brief explanation of query optimization',
              },
            },
            required: ['queryEn'],
            additionalProperties: false,
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data: GeminiResponse = await response.json()

    // Handle API errors
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.code} - ${data.error.message || 'Unknown error'}`)
    }

    // Extract JSON response from Gemini
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textContent) {
      throw new Error('Gemini API returned empty response')
    }

    // Try to extract and parse JSON using robust extractor
    const parsed = extractJson(textContent)

    let queryEnBase: string = ''
    let reason: string | undefined

    if (parsed && typeof parsed.queryEn === 'string' && parsed.queryEn.trim().length > 0) {
      // Successfully parsed JSON with valid queryEn
      queryEnBase = parsed.queryEn.trim()
      reason = parsed.reason
    } else {
      // JSON parsing failed, try to extract query from raw text
      const extracted = extractQueryFromText(textContent)
      
      if (extracted && extracted.length > 0) {
        // Check if extracted text is English
        if (containsNonLatinScript(extracted)) {
          // Text is not English, try translation
          const translated = await translateToEnglish(extracted, geminiApiKey, geminiModel)
          if (translated && translated.length > 0) {
            queryEnBase = translated.trim()
            reason = 'Translated from non-English text'
          } else {
            // Translation failed, will use deterministic fallback below
            queryEnBase = ''
          }
        } else {
          // Text appears to be English, use it
          queryEnBase = extracted
          reason = 'Extracted from raw response'
        }
      }

      // Log warning with truncated raw text (not full error)
      if (!queryEnBase) {
        const truncated = textContent.slice(0, 120)
        console.warn('Gemini JSON parse failed, fallback. Raw(head):', truncated)
      }
    }

    // Validate query - if bad, try second Gemini call or deterministic fallback
    if (!queryEnBase || queryEnBase.trim().length === 0 || isBadQuery(queryEnBase, brand)) {
      // Try second Gemini call (cheap, one-line output)
      if (geminiApiKey && title) {
        try {
          const secondCallResult = await translateToEnglish(title, geminiApiKey, geminiModel)
          if (secondCallResult && secondCallResult.trim().length > 0 && !isBadQuery(secondCallResult, brand)) {
            queryEnBase = secondCallResult.trim()
            reason = 'Second Gemini call (one-line)'
          }
        } catch (error) {
          // Second call failed, will use deterministic fallback
        }
      }
      
      // If still bad or no second call, use deterministic fallback
      if (!queryEnBase || isBadQuery(queryEnBase, brand)) {
        const cleanedTitle = cleanTitle(title || '')
        queryEnBase = [brand, cleanedTitle].filter(Boolean).join(' ').trim() || 'product'
        reason = 'Deterministic fallback'
      }
    }

    // Clean up query: trim, collapse whitespace, limit length
    queryEnBase = queryEnBase
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 120)
    
    // Create final query with negative terms for search
    const negativeTerms = '-json -schema -code -programming -api -database -tutorial -diagram -screenshot'
    const queryEnFinal = `${queryEnBase} ${negativeTerms}`.trim()

    // Determine method
    const fallbackQuery = [brand, cleanTitle(title || '')].filter(Boolean).join(' ').trim() || 'product'
    const method = parsed && typeof parsed.queryEn === 'string' && !isBadQuery(queryEnBase, brand)
      ? 'gemini' 
      : (queryEnBase !== fallbackQuery && !isBadQuery(queryEnBase, brand) ? 'gemini-translate' : 'fallback')

    return {
      queryEnBase,
      queryEnFinal,
      reason,
      method,
    }
  } catch (error: any) {
    // On any error, fall back to simple concatenation
    const cleanedTitle = cleanTitle(title || '')
    const fallbackQueryBase = [brand, cleanedTitle].filter(Boolean).join(' ').trim() || 'product'
    const negativeTerms = '-json -schema -code -programming -api -database -tutorial -diagram -screenshot'
    const fallbackQueryFinal = `${fallbackQueryBase} ${negativeTerms}`.trim()
    return {
      queryEnBase: fallbackQueryBase,
      queryEnFinal: fallbackQueryFinal,
      method: 'fallback',
      reason: error.message || 'Gemini API unavailable',
    }
  }
}

