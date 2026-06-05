import { formatRp, formatDateTime, ORDER_TYPE_LABELS, PLATFORM_LABELS, PAYMENT_LABELS } from './format'

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

export function executePrintReceipt(receipt, settings = {}) {
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
