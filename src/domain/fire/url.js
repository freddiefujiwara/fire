import LZString from "lz-string";

/**
 * Decode compressed URL state into a plain object.
 * @param {string} encoded - Encoded state from route params.
 * @returns {object|null} Decoded object, or null when decode fails.
 */
export const decode = (encoded) => {
  if (!encoded) return null;
  try {
    // Handle cases where '+' characters are converted to spaces (common in query params)
    // or '_' was used for encoding, or it was double-encoded to %20
    const normalized = encoded
      .replace(/ /g, '+')
      .replace(/_/g, '+')
      .replace(/%20/g, '+');
    const decompressed = LZString.decompressFromEncodedURIComponent(normalized);
    if (!decompressed) return null;
    return JSON.parse(decompressed);
  } catch (e) {
    console.error("Failed to decode URL state", e);
    return null;
  }
};

/**
 * Encode state object into a short URL-safe string.
 * @param {object} value - State object to encode.
 * @returns {string} Encoded URL value.
 */
export const encode = (value) => {
  if (!value) return "";
  // Replace '+' with '_' to avoid issues with space conversion in query parameters
  return LZString.compressToEncodedURIComponent(JSON.stringify(value)).replace(/\+/g, '_');
};
