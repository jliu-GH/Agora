/**
 * Comprehensive HTML cleaning utilities for bill descriptions and summaries
 */

export function cleanHtmlContent(htmlString: string): string {
  if (!htmlString || typeof htmlString !== 'string') {
    return '';
  }

  // Remove HTML tags while preserving content structure
  let cleaned = htmlString
    // Remove script and style tags completely
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Convert common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    
    // Convert list items to bullet points
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    
    // Convert paragraphs to line breaks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    
    // Convert line breaks
    .replace(/<br[^>]*>/gi, '\n')
    
    // Convert headers to emphasized text
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    
    // Handle strong/bold tags
    .replace(/<strong[^>]*>/gi, '')
    .replace(/<\/strong>/gi, '')
    .replace(/<b[^>]*>/gi, '')
    .replace(/<\/b>/gi, '')
    
    // Handle emphasis/italic tags
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<i[^>]*>/gi, '')
    .replace(/<\/i>/gi, '')
    
    // Handle links - preserve URL but remove HTML
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    
    // Handle divs and spans
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    
    // Handle lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
    .replace(/^\s+|\s+$/g, '') // Trim start/end
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
    .replace(/\n /g, '\n') // Remove spaces at start of lines
    
    // Decode remaining HTML entities
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));

  return cleaned.trim();
}

export function cleanBillTitle(title: string): string {
  if (!title || typeof title !== 'string') {
    return 'Untitled Bill';
  }

  return cleanHtmlContent(title)
    .replace(/^(.*?)\s*-\s*$/, '$1') // Remove trailing dashes
    .trim();
}

export function cleanBillSummary(summary: string): string {
  if (!summary || typeof summary !== 'string') {
    return 'No summary available.';
  }

  const cleaned = cleanHtmlContent(summary);
  
  // If the summary is too short after cleaning, provide a fallback
  if (cleaned.length < 10) {
    return 'Summary not available in readable format.';
  }

  return cleaned;
}

export function formatBillDescription(description: string): string {
  const cleaned = cleanBillSummary(description);
  
  // Split into paragraphs and format nicely
  const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
  
  return paragraphs.map(paragraph => {
    // Clean up bullet points
    const lines = paragraph.split('\n').map(line => {
      line = line.trim();
      if (line.startsWith('•')) {
        return `  ${line}`; // Indent bullet points
      }
      return line;
    });
    
    return lines.join('\n');
  }).join('\n\n');
}

export function extractPlainTextFromHtml(html: string, maxLength?: number): string {
  const cleaned = cleanHtmlContent(html);
  
  if (maxLength && cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}
