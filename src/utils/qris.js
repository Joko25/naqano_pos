/**
 * QRIS Dynamic Amount Injection and CRC16 Calculation
 * Based on EMVCo Standard (ID: QRIS)
 */

export function computeCRC16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generateDynamicQRIS(staticQR, amount) {
  try {
    // 1. Parse manual EMVCo format safely
    const tags = new Map();
    let i = 0;
    // Remove original CRC (last 4 chars) and the 6304 tag itself for parsing
    const cleanQR = staticQR.slice(0, -4).replace(/6304$/, '');
    
    while (i < cleanQR.length) {
      const tag = cleanQR.substr(i, 2);
      const lenStr = cleanQR.substr(i + 2, 2);
      const len = parseInt(lenStr, 10);
      const val = cleanQR.substr(i + 4, len);
      
      if (tag && !isNaN(len)) {
        tags.set(tag, val);
      }
      i += 4 + len;
    }

    // 2. Change Point of Initiation Method to 12 (Dynamic)
    // Tag 01: 11 is Static, 12 is Dynamic
    tags.set('01', '12');

    // 3. Set Amount (Tag 54)
    tags.set('54', amount.toString());

    // 4. Reassemble in order
    // Order matters for some apps, but following the original sequence is best
    const sortedTags = Array.from(tags.keys()).sort((a, b) => parseInt(a) - parseInt(b));
    let assembled = '';
    for (const tag of sortedTags) {
      const val = tags.get(tag);
      const len = val.length.toString().padStart(2, '0');
      assembled += `${tag}${len}${val}`;
    }

    // 5. Append Tag 63 (CRC)
    assembled += '6304';
    const crc = computeCRC16(assembled);
    
    return assembled + crc;
  } catch (err) {
    console.error('QRIS Re-generation Error:', err);
    return staticQR; // Fallback
  }
}
