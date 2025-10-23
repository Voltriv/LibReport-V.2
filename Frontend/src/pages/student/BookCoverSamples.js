/*
 GUIDE: Book cover images
 - Place image files under `frontend/public/covers/` or `frontend/src/assets/covers/`
 - Use absolute public paths like `/covers/banking-business-models.jpg` in mappings below.
 - If no cover is found, a safe fallback (`/logo192.png`) is used.
 - You can map by `id`, `isbn`, or by `title` (case-insensitive).
 - Books can also have direct coverUrl property which takes precedence.
*/

export const coverSamples = {
  byId: {
    // Map by numeric id
    1: "/covers/banking-business-models.jpg",
    2: "/covers/investment.jpg",
    3: "/covers/money-credit-crises.jpg",
    4: "/covers/contested-territory.jpg",
    5: "/covers/philosophical-difference.jpg",
    6: "/covers/construction-estimating.jpg",
    7: "/covers/fundamentals-construction.jpg",
    8: "/covers/companion-childrens-lit.jpg",
    9: "/covers/reading-childrens-lit.jpg"
  },
  byIsbn: {
    // Map by ISBN string
    "978-111865621": "/covers/investment-banking.jpg",
    "978-0691178417": "/covers/money-credit-crises.jpg",
    "978-1138583115": "/covers/contested-territory.jpg",
    "978-0367235543": "/covers/philosophical-difference.jpg",
    "978-0876290170": "/covers/construction-estimating.jpg",
    "978-1439059647": "/covers/fundamentals-construction.jpg",
    "978-1119038221": "/covers/companion-childrens-lit.jpg",
    "978-1319465063": "/covers/reading-childrens-lit.jpg"
  },
  byTitle: {
    // Map by normalized title (lowercase, trimmed)
    "banking business models": "/covers/banking-business-models.jpg",
    "investment banking": "/covers/investment-banking.jpg",
    "money, credit, and crises": "/covers/money-credit-crises.jpg",
    "the contested territory of architectural theory": "/covers/contested-territory.jpg",
    "philosophical difference and advanced computation in architectural theory": "/covers/philosophical-difference.jpg",
    "construction estimating & bidding": "/covers/construction-estimating.jpg",
    "fundamentals of construction estimating": "/covers/fundamentals-construction.jpg",
    "a companion to children's literature": "/covers/companion-childrens-lit.jpg",
    "reading children's literature": "/covers/reading-childrens-lit.jpg"
  },
  fallback: "/logo192.png"
};

/**
 * Get the cover image URL for a book
 * @param {Object} book - The book object
 * @returns {string} - URL to the cover image
 */
export function getCoverForBook(book) {
  // Direct coverUrl takes precedence if it exists
  if (book.coverUrl) {
    return book.coverUrl;
  }
  
  // Try to find by ID
  if (book.id && coverSamples.byId[book.id]) {
    return coverSamples.byId[book.id];
  }
  
  // Try to find by ISBN
  if (book.isbn && coverSamples.byIsbn[book.isbn]) {
    return coverSamples.byIsbn[book.isbn];
  }
  
  // Try to find by title (case-insensitive)
  if (book.title) {
    const normalizedTitle = book.title.toLowerCase().trim();
    if (coverSamples.byTitle[normalizedTitle]) {
      return coverSamples.byTitle[normalizedTitle];
    }
  }
  
  // Return fallback if no match found
  return coverSamples.fallback;
}