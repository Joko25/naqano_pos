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
    // 1. Remove the existing CRC (last 4 chars)
    let qris = staticQR.slice(0, -4);
    
    // 2. Prepare Amount Tag (54)
    const amountStr = amount.toString();
    const amountLen = amountStr.length.toString().padStart(2, '0');
    const tag54 = `54${amountLen}${amountStr}`;
    
    // 3. Check for Tag 54 in string. If it exists, replace. 
    // Format is [Tag][Length][Value]
    if (qris.includes('54')) {
      // Find 54, get its length at n+2, n+3
      const index = qris.indexOf('54');
      const oldLen = parseInt(qris.substr(index + 2, 2));
      qris = qris.slice(0, index) + tag54 + qris.slice(index + 4 + oldLen);
    } else {
      // Inject before Tag 58 (Country Code) or Tag 63 (CRC)
      const tag58Index = qris.indexOf('5802ID');
      if (tag58Index !== -1) {
        qris = qris.slice(0, tag58Index) + tag54 + qris.slice(tag58Index);
      } else {
        // Fallback: search for Tag 63 (Standard CRC start)
        const tag63Index = qris.indexOf('6304');
        if (tag63Index !== -1) {
          qris = qris.slice(0, tag63Index) + tag54 + qris.slice(tag63Index);
        } else {
          // Absolute fallback: just append
          qris += tag54;
        }
      }
    }
    
    // Ensure 6304 is at the end (without CRC)
    if (!qris.endsWith('6304')) {
      // Remove any trailing 6304 if it got moved
      qris = qris.replace(/6304$/, '') + '6304';
    }
    
    // 4. Compute new CRC
    const crc = computeCRC16(qris);
    return qris + crc;
  } catch (err) {
    console.error('QRIS Generation Error:', err);
    return staticQR; // Fallback to static if failed
  }
}
