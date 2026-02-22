const KEY_STR_URI_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

/**
 * Compress a string with LZ-style dictionary logic.
 */
function compress(uncompressed, bitsPerChar, getCharFromInt) {
  if (uncompressed == null) {
    return "";
  }

  let i;
  const contextDictionary = Object.create(null);
  const contextDictionaryToCreate = Object.create(null);
  let contextC = "";
  let contextWC = "";
  let contextW = "";
  let contextEnlargeIn = 2;
  let contextDictSize = 3;
  let contextNumBits = 2;
  const contextData = [];
  let contextDataVal = 0;
  let contextDataPosition = 0;

  /**
   * Write bits into output buffer.
   */
  const writeBits = (numBits, val) => {
    for (let j = 0; j < numBits; j += 1) {
      contextDataVal = (contextDataVal << 1) | (val & 1);
      if (contextDataPosition === bitsPerChar - 1) {
        contextDataPosition = 0;
        contextData.push(getCharFromInt(contextDataVal));
        contextDataVal = 0;
      } else {
        contextDataPosition += 1;
      }
      val >>= 1;
    }
  };

  /**
   * Emit current token from dictionary state.
   */
  const produceW = () => {
    if (Object.prototype.hasOwnProperty.call(contextDictionaryToCreate, contextW)) {
      if (contextW.charCodeAt(0) < 256) {
        writeBits(contextNumBits, 0);
        writeBits(8, contextW.charCodeAt(0));
      } else {
        writeBits(contextNumBits, 1);
        writeBits(16, contextW.charCodeAt(0));
      }
      contextEnlargeIn -= 1;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits += 1;
      }
      delete contextDictionaryToCreate[contextW];
    } else {
      writeBits(contextNumBits, contextDictionary[contextW]);
    }

    contextEnlargeIn -= 1;
    if (contextEnlargeIn === 0) {
      contextEnlargeIn = 2 ** contextNumBits;
      contextNumBits += 1;
    }
  };

  for (i = 0; i < uncompressed.length; i += 1) {
    contextC = uncompressed.charAt(i);
    if (!Object.prototype.hasOwnProperty.call(contextDictionary, contextC)) {
      contextDictionary[contextC] = contextDictSize;
      contextDictSize += 1;
      contextDictionaryToCreate[contextC] = true;
    }

    contextWC = contextW + contextC;
    if (Object.prototype.hasOwnProperty.call(contextDictionary, contextWC)) {
      contextW = contextWC;
    } else {
      produceW();
      contextDictionary[contextWC] = contextDictSize;
      contextDictSize += 1;
      contextW = contextC;
    }
  }

  if (contextW !== "") {
    produceW();
  }

  writeBits(contextNumBits, 2);

  while (true) {
    contextDataVal <<= 1;
    if (contextDataPosition === bitsPerChar - 1) {
      contextData.push(getCharFromInt(contextDataVal));
      break;
    }
    contextDataPosition += 1;
  }

  return contextData.join("");
}

/**
 * Compress input and return URI-safe text.
 */
export function compressToEncodedURIComponent(input) {
  if (input == null) {
    return "";
  }

  return compress(input, 6, (a) => KEY_STR_URI_SAFE.charAt(a));
}
