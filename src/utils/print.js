import { formatRp, formatDateTime, ORDER_TYPE_LABELS, PLATFORM_LABELS, PAYMENT_LABELS } from './format'

// Module-level variables to hold active connection
let activeDevice = null
let activeCharacteristic = null

function handleDisconnect() {
  activeDevice = null
  activeCharacteristic = null
}

class EscPosEncoder {
  constructor() {
    this.buffer = []
  }
  
  writeBytes(bytes) {
    if (bytes instanceof Array) {
      this.buffer.push(...bytes)
    } else if (bytes instanceof Uint8Array) {
      this.buffer.push(...Array.from(bytes))
    }
    return this
  }
  
  initialize() {
    return this.writeBytes([0x1B, 0x40])
  }
  
  align(value) {
    return this.writeBytes([0x1B, 0x61, value])
  }
  
  bold(value) {
    return this.writeBytes([0x1B, 0x45, value ? 1 : 0])
  }
  
  doubleSize(value) {
    return this.writeBytes([0x1D, 0x21, value ? 0x11 : 0x00])
  }
  
  text(value) {
    const encoder = new TextEncoder()
    return this.writeBytes(encoder.encode(value))
  }
  
  newline() {
    return this.writeBytes([0x0A])
  }
  
  feed(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.newline()
    }
    return this
  }
  
  cut() {
    // GS V 66 0 (feeds paper and cuts)
    return this.writeBytes([0x1D, 0x56, 0x42, 0x00])
  }
  
  encode() {
    return new Uint8Array(this.buffer)
  }
}

function formatRow(left, right, maxChars) {
  const spaces = maxChars - left.length - right.length
  return spaces > 0 ? left + ' '.repeat(spaces) + right : left + ' ' + right
}

export function generateEscPosBytes(receipt, settings = {}) {
  const encoder = new EscPosEncoder()
  const maxChars = settings.printerWidth === '80mm' ? 48 : 32

  encoder.initialize()

  // Shop Name (Centered, Bold, Double Size)
  encoder.align(1).bold(true).doubleSize(true)
  encoder.text(receipt.shopName || 'Naqano Coffee').newline()
  
  // Shop Address & Phone
  encoder.bold(false).doubleSize(false)
  if (receipt.shopAddress) {
    encoder.text(receipt.shopAddress).newline()
  }
  if (receipt.shopPhone) {
    encoder.text(receipt.shopPhone).newline()
  }
  
  // Divider
  encoder.align(0).text('─'.repeat(maxChars)).newline()

  // Meta info
  encoder.text(`No: ${receipt.receiptNo}`).newline()
  encoder.text(`Tgl: ${formatDateTime(receipt.createdAt)}`).newline()
  if (receipt.customerName) {
    encoder.text(`Nama: ${receipt.customerName}`).newline()
  }
  
  const typeLabel = ORDER_TYPE_LABELS[receipt.orderType] || receipt.orderType
  const platformLabel = receipt.platform ? ` (${PLATFORM_LABELS[receipt.platform] || receipt.platform})` : ''
  encoder.text(`Tipe: ${typeLabel}${platformLabel}`).newline()
  
  const payLabel = PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod
  encoder.text(`Bayar: ${payLabel}`).newline()
  
  // Divider
  encoder.text('─'.repeat(maxChars)).newline()

  // Items
  ;(receipt.items || []).forEach(item => {
    const itemAddonsPrice = item.selectedAddons?.reduce((s, a) => s + (a.price * a.qty), 0) || 0
    const itemTotal = (item.price + itemAddonsPrice) * item.qty
    
    const qtyText = `${item.qty}x `
    const nameText = `${item.name}${item.temp && item.temp !== 'None' ? ` (${item.temp})` : ''}`
    const priceText = formatRp(itemTotal)
    
    const leftText = qtyText + nameText
    
    if (leftText.length + priceText.length + 1 <= maxChars) {
      encoder.text(formatRow(leftText, priceText, maxChars)).newline()
    } else {
      encoder.text(leftText).newline()
      encoder.text(formatRow('', priceText, maxChars)).newline()
    }
    
    // Variants & Addons
    if (item.variants && item.variants.length > 0) {
      encoder.text(`  ${item.variants.join(', ')}`).newline()
    }
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      item.selectedAddons.forEach(a => {
        encoder.text(`  +${a.qty} ${a.name}`).newline()
      })
    }
  })

  // Divider
  encoder.text('─'.repeat(maxChars)).newline()

  // Totals
  encoder.text(formatRow('Subtotal', formatRp(receipt.subtotal), maxChars)).newline()
  if (receipt.discount > 0) {
    encoder.text(formatRow('Diskon', `-${formatRp(receipt.discount)}`, maxChars)).newline()
  }
  if (receipt.tax > 0) {
    encoder.text(formatRow('Pajak', formatRp(receipt.tax), maxChars)).newline()
  }
  
  encoder.bold(true)
  encoder.text(formatRow('TOTAL', formatRp(receipt.total), maxChars)).newline()
  encoder.bold(false)

  if (receipt.paymentMethod === 'cash') {
    encoder.text(formatRow('Tunai', formatRp(receipt.cashReceived), maxChars)).newline()
    encoder.text(formatRow('Kembali', formatRp(receipt.change), maxChars)).newline()
  }

  // Divider
  encoder.text('─'.repeat(maxChars)).newline()

  // Footer (Centered)
  if (receipt.receiptFooter) {
    encoder.align(1).text(receipt.receiptFooter).newline()
  }

  // Feed and Cut
  encoder.feed(4)
  encoder.cut()

  return encoder.encode()
}

export async function connectBluetoothPrinter() {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('Web Bluetooth tidak didukung di browser atau device ini. Pastikan Anda menggunakan Chrome via HTTPS.')
  }
  
  const optionalServices = [
    '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0
    '000018f0-0000-1000-8000-00805f9b34fb'  // Standard Print Service
  ]

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: optionalServices
  })

  const server = await device.gatt.connect()
  
  let characteristic = null
  for (const serviceUuid of optionalServices) {
    try {
      const service = await server.getPrimaryService(serviceUuid)
      const characteristics = await service.getCharacteristics()
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          characteristic = char
          break
        }
      }
      if (characteristic) break
    } catch (e) {
      console.log(`Service ${serviceUuid} not found or error:`, e)
    }
  }

  if (!characteristic) {
    try {
      const services = await server.getPrimaryServices()
      for (const service of services) {
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char
            break
          }
        }
        if (characteristic) break
      }
    } catch (e) {
      console.log('Error discovering all services:', e)
    }
  }

  if (!characteristic) {
    throw new Error('Printer service/karakteristik tidak ditemukan.')
  }

  activeDevice = device
  activeCharacteristic = characteristic
  device.addEventListener('gattserverdisconnected', handleDisconnect)
  
  return { name: device.name || 'Printer Bluetooth' }
}

export async function disconnectBluetoothPrinter() {
  if (activeDevice && activeDevice.gatt.connected) {
    activeDevice.gatt.disconnect()
  }
  handleDisconnect()
}

export function getConnectedBluetoothDevice() {
  if (activeDevice && activeDevice.gatt.connected) {
    return { name: activeDevice.name || 'Printer Bluetooth' }
  }
  return null
}

export async function printDirectBluetooth(receipt, settings) {
  if (!activeCharacteristic) {
    throw new Error('Printer tidak terhubung.')
  }
  const bytes = generateEscPosBytes(receipt, settings)
  
  const chunkSize = 20
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize)
    await activeCharacteristic.writeValue(chunk)
    await new Promise(resolve => setTimeout(resolve, 30))
  }
}

export function receiptHTML(receipt, settings = {}) {
  const width = settings.printerWidth === '80mm' ? '360px' : '280px'
  const fontSize = settings.receiptFontSize || '12px'

  const items = (receipt?.items || []).map(i => {
    let variantsHtml = ''
    if (i.variants && i.variants.length > 0) {
      variantsHtml += `<div style="font-size: 10px; color: #555; margin-left: 14px;">${i.variants.join(', ')}</div>`
    }
    if (i.selectedAddons && i.selectedAddons.length > 0) {
      variantsHtml += `<div style="font-size: 10px; color: #555; margin-left: 14px;">${i.selectedAddons.map(a => `+${a.qty} ${a.name}`).join(', ')}</div>`
    }
    const itemAddonsPrice = i.selectedAddons?.reduce((s, a) => s + (a.price * a.qty), 0) || 0
    const itemTotal = (i.price + itemAddonsPrice) * i.qty

    return `<div>
      <div class="ri"><span>${i.qty}x ${i.name} ${i.temp && i.temp !== 'None' ? `(${i.temp})` : ''}</span><span>${formatRp(itemTotal)}</span></div>
      ${variantsHtml}
    </div>`
  }).join('')

  return `<style>
    @media print {
      * { box-sizing: border-box; margin: 0; padding: 0; }
      #print-receipt-container { 
        font-family: 'Courier New', monospace; 
        font-size: ${fontSize}; 
        color: #000; 
        background: #fff; 
        padding: 10px; 
        width: ${width};
        margin: 0 auto;
        -webkit-print-color-adjust: exact;
      }
      .receipt-logo { display: block; margin: 0 auto 10px; max-height: 60px; max-width: 180px; object-fit: contain; }
      .sh { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px; }
      .sa { text-align: center; font-size: 11px; margin-bottom: 8px; color: #000; line-height: 1.3; }
      .div { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
      .ri { display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0; }
      .total-row { font-weight: bold; font-size: 13px; margin-top: 4px; }
      .footer { text-align: center; font-size: 10px; margin-top: 12px; color: #555; }
      @page { 
        margin: 0; 
        size: ${settings.printerWidth || '58mm'} auto;
      }
      /* Hide scrollbars, headers, footers added by browser */
      ::-webkit-scrollbar { display: none; }
    }
  </style>
  ${receipt.shopLogo && receipt.shopLogo !== '/logo.png' ? `<img src="${receipt.shopLogo}" class="receipt-logo" />` : ''}
  <div class="sh">${receipt.shopName}</div>
  <div class="sa">${receipt.shopAddress}</div>
  <div class="div"></div>
  <div class="row"><span>No: ${receipt.receiptNo}</span></div>
  <div class="row"><span>Tgl: ${formatDateTime(receipt.createdAt)}</span></div>
  ${receipt.customerName ? `<div class="row"><span>Nama: ${receipt.customerName}</span></div>` : ''}
  <div class="row"><span>Tipe: ${ORDER_TYPE_LABELS[receipt.orderType]}${receipt.platform ? ` (${PLATFORM_LABELS[receipt.platform]})` : ''}</span></div>
  <div class="row"><span>Bayar: ${PAYMENT_LABELS[receipt.paymentMethod]}</span></div>
  <div class="div"></div>
  ${items}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${formatRp(receipt.subtotal)}</span></div>
  ${receipt.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatRp(receipt.discount)}</span></div>` : ''}
  ${receipt.tax > 0 ? `<div class="row"><span>Pajak</span><span>${formatRp(receipt.tax)}</span></div>` : ''}
  <div class="row total-row"><span>TOTAL</span><span>${formatRp(receipt.total)}</span></div>
  ${receipt.paymentMethod === 'cash' ? `<div class="row"><span>Tunai</span><span>${formatRp(receipt.cashReceived)}</span></div><div class="row"><span>Kembali</span><span>${formatRp(receipt.change)}</span></div>` : ''}
  <div class="div"></div>
  <div class="footer">${receipt.receiptFooter}</div>`
}

export async function executePrintReceipt(receipt, settings = {}) {
  // If connection is bluetooth
  if (settings.printerConnection === 'bluetooth') {
    try {
      if (!activeCharacteristic) {
        // Trigger connection dialog
        const dev = await connectBluetoothPrinter()
        alert(`Berhasil terhubung ke: ${dev.name}. Memulai cetak struk...`)
      }
      await printDirectBluetooth(receipt, settings)
    } catch (err) {
      console.error(err)
      alert('Gagal cetak Bluetooth: ' + err.message)
    }
    return
  }

  // Clean up previous container if it exists
  const existingContainer = document.getElementById('print-receipt-container')
  if (existingContainer) existingContainer.remove()

  // Create print container
  const printContainer = document.createElement('div')
  printContainer.id = 'print-receipt-container'
  printContainer.innerHTML = receiptHTML(receipt, settings)
  document.body.appendChild(printContainer)

  const originalTitle = document.title
  document.title = `Struk #${receipt.receiptNo}`

  // Delay a bit to ensure browser renders the DOM before print preview
  setTimeout(() => {
    window.print()
  }, 300)

  // Cleanup function
  const cleanup = () => {
    if (printContainer.parentNode) printContainer.remove()
    document.title = originalTitle
    document.body.removeEventListener('click', cleanup)
    document.body.removeEventListener('touchstart', cleanup)
  }

  // Clean up when window gets focus back (user returns from print dialog and taps screen)
  setTimeout(() => {
    document.body.addEventListener('click', cleanup)
    document.body.addEventListener('touchstart', cleanup)
  }, 1000)
  
  // Safety fallback: clean up after 5 minutes
  setTimeout(cleanup, 300000)
}
