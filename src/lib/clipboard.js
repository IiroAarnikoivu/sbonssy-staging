/**
 * Robust clipboard utility that handles Safari mobile and requests permissions
 * @param {string} text - The text to copy to clipboard
 * @returns {Promise<boolean>} - Returns true if copy was successful, false otherwise
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  try {
    // For Safari mobile and browsers that support Clipboard API with permissions
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Try to request clipboard permission first (especially important for Safari)
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permission = await navigator.permissions.query({ name: 'clipboard-write' });
          if (permission.state === 'denied') {
            // Permission denied, fall back to alternative method
            return fallbackCopy(text);
          }
        } catch (permErr) {
          // Permissions API not available or query failed, continue anyway
          console.log('Clipboard permission query not available:', permErr);
        }
      }

      // Attempt to write to clipboard
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for browsers without Clipboard API
    return fallbackCopy(text);
  } catch (error) {
    console.error('Primary clipboard copy failed:', error);
    // Try fallback method
    return fallbackCopy(text);
  }
}

/**
 * Fallback copy method using temporary textarea element
 * Works on Safari mobile and older browsers
 * @param {string} text - The text to copy
 * @returns {boolean} - Success status
 */
function fallbackCopy(text) {
  try {
    // Create temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Make it invisible but accessible
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';

    // Prevent zoom on iOS
    textarea.style.fontSize = '16px';

    // Make it readonly to prevent keyboard popup on iOS
    textarea.setAttribute('readonly', 'readonly');
    textarea.contentEditable = true;

    // Add to DOM
    document.body.appendChild(textarea);

    // Focus and select for iOS Safari
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    textarea.select();

    // Execute copy command
    const successful = document.execCommand('copy');

    // Clean up
    document.body.removeChild(textarea);

    return successful;
  } catch (error) {
    console.error('Fallback clipboard copy failed:', error);
    return false;
  }
}

/**
 * Select text in an element - useful for iOS manual copy
 * @param {HTMLElement} element - The element containing text to select
 */
export function selectText(element) {
  if (!element) return;

  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (error) {
    console.error('Text selection failed:', error);
  }
}

/**
 * Copy to clipboard with user-friendly error handling
 * Shows a fallback dialog if automatic copy fails
 * @param {string} text - The text to copy
 * @param {Object} options - Optional configuration
 * @param {Function} options.onSuccess - Callback on successful copy
 * @param {Function} options.onError - Callback on copy failure
 * @param {Function} options.showFallbackDialog - Function to show manual copy dialog
 * @returns {Promise<boolean>} - Success status
 */
export async function copyWithFallback(text, options = {}) {
  const { onSuccess, onError, showFallbackDialog } = options;

  const success = await copyToClipboard(text);

  if (success) {
    if (onSuccess) onSuccess();
    return true;
  } else {
    // If automatic copy failed, show fallback dialog
    if (showFallbackDialog) {
      showFallbackDialog(text);
    }
    if (onError) onError();
    return false;
  }
}
