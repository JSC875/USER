/**
 * OTP Utility Functions
 * Provides consistent OTP detection, validation, and formatting across the app
 */

/**
 * Detects OTP codes from various text formats
 * @param text - The text to search for OTP codes
 * @returns Array of detected OTP codes
 */
export function detectOTPCodes(text: string): string[] {
  // Common OTP patterns
  const patterns = [
    /\b\d{6}\b/g,           // 6-digit OTP
    /\b\d{4}\b/g,           // 4-digit OTP
    /\b\d{8}\b/g,           // 8-digit OTP
    /OTP[:\s]*(\d{4,8})/gi, // OTP: 123456
    /code[:\s]*(\d{4,8})/gi, // code: 123456
    /verification[:\s]*(\d{4,8})/gi, // verification: 123456
  ];

  const foundCodes: string[] = [];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Extract just the digits
        const digits = match.replace(/\D/g, '');
        if (digits.length >= 4 && digits.length <= 8) {
          foundCodes.push(digits);
        }
      });
    }
  });

  // Remove duplicates and sort by length (prefer 6-digit codes)
  return [...new Set(foundCodes)].sort((a, b) => {
    if (a.length === 6 && b.length !== 6) return -1;
    if (b.length === 6 && a.length !== 6) return 1;
    return a.length - b.length;
  });
}

/**
 * Validates if a string is a valid OTP code
 * @param code - The code to validate
 * @param expectedLength - Expected length (default: 6)
 * @returns True if valid OTP
 */
export function isValidOTP(code: string, expectedLength: number = 6): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Check if it's all digits and correct length
  const digitPattern = new RegExp(`^\\d{${expectedLength}}$`);
  return digitPattern.test(code);
}

/**
 * Formats OTP for display (adds spaces every 2 digits)
 * @param code - The OTP code
 * @returns Formatted OTP string
 */
export function formatOTP(code: string): string {
  if (!code) return '';
  
  // Remove non-digits
  const digits = code.replace(/\D/g, '');
  
  // Add spaces every 2 digits
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

/**
 * Cleans OTP text by removing common prefixes/suffixes
 * @param text - Raw text that might contain OTP
 * @returns Cleaned OTP text
 */
export function cleanOTPText(text: string): string {
  if (!text) return '';
  
  // Remove common SMS prefixes/suffixes
  const cleaned = text
    .replace(/^.*?(OTP|code|verification|pin|password)[:\s]*/i, '') // Remove prefix
    .replace(/[^\d].*$/g, '') // Remove everything after first non-digit
    .trim();
  
  return cleaned;
}

/**
 * Extracts the most likely OTP from clipboard text
 * @param clipboardText - Text from clipboard
 * @param preferredLength - Preferred OTP length (default: 6)
 * @returns Best matching OTP or null
 */
export function extractBestOTP(clipboardText: string, preferredLength: number = 6): string | null {
  if (!clipboardText) return null;
  
  const detectedCodes = detectOTPCodes(clipboardText);
  
  if (detectedCodes.length === 0) return null;
  
  // Prefer codes with preferred length
  const preferredCodes = detectedCodes.filter(code => code.length === preferredLength);
  if (preferredCodes.length > 0) {
    return preferredCodes[0] || null;
  }
  
  // Return the first detected code
  return detectedCodes[0] || null;
}

/**
 * Checks if clipboard text contains a valid OTP
 * @param clipboardText - Text from clipboard
 * @param expectedLength - Expected OTP length (default: 6)
 * @returns True if valid OTP found
 */
export function clipboardContainsOTP(clipboardText: string, expectedLength: number = 6): boolean {
  const otp = extractBestOTP(clipboardText, expectedLength);
  return otp !== null && isValidOTP(otp, expectedLength);
}

