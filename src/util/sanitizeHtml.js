import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML using DOMPurify - removes dangerous scripts and event handlers
 * while keeping basic formatting tags safe for display
 *
 * @param {string} html - Raw HTML string to sanitize
 * @returns {string} - Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  // Configure DOMPurify to allow common formatting tags
  const config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'span', 'div',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'blockquote', 'code', 'pre', 'hr', 'table',
      'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id',
      'data-start', 'data-end' // Keeping Shopify's data attributes
    ],
    ALLOW_DATA_ATTR: true, // Allow data-* attributes
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };

  return DOMPurify.sanitize(html, config);
}

/**
 * Strips all HTML tags and returns plain text
 * Useful for search/filtering or displaying in plain text contexts
 *
 * @param {string} html - HTML string to strip
 * @returns {string} - Plain text without HTML tags
 */
export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Decode common entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}
