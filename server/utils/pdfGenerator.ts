import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Helper: Indian Rupee Number to Words
function numberToWords(num: number): string {
  if (num === 0) return 'Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n: number) => {
    let str = '';
    if (n > 99) { str += a[Math.floor(n / 100)] + 'Hundred '; n %= 100; }
    if (n > 19) { str += b[Math.floor(n / 10)] + ' '; n %= 10; }
    if (n > 0) { str += a[n]; }
    return str.trim();
  };
  
  let temp = Math.floor(num);
  let result = '';
  
  if (temp > 9999999) { result += inWords(Math.floor(temp / 10000000)) + ' Crore '; temp %= 10000000; }
  if (temp > 99999) { result += inWords(Math.floor(temp / 100000)) + ' Lakh '; temp %= 100000; }
  if (temp > 999) { result += inWords(Math.floor(temp / 1000)) + ' Thousand '; temp %= 1000; }
  if (temp > 0) { result += inWords(temp); }
  
  return result.trim() + ' Only';
}

export function generateInvoicePdf(
  res: Response,
  invoice: any,
  company: any,
  client: any,
  lineItems: any[]
) {
  const MARGIN = 30; 
  const PAGE_WIDTH = 595.28; 
  const PAGE_HEIGHT = 841.89; 
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

  // Dynamic config extraction
  const COLOR_PRIMARY = company.theme_color_primary || '#1E3A8A';
  const COLOR_ACCENT = company.theme_color_secondary || '#2563EB';
  const COLOR_BLUE_BG = '#F9FAFB'; // Neutral light background for cards
  const COLOR_DARK = '#1F2937';
  const COLOR_GREY = '#4B5563';
  const COLOR_LIGHT_GREY = '#9CA3AF';
  const COLOR_BORDER = '#E5E7EB'; 

  // Safely map requested fonts to PDFKit standard fonts
  const requestedFont = company.font_family || 'Helvetica';
  const standardFonts = ['Helvetica', 'Courier', 'Times-Roman'];
  const FONT_REGULAR = standardFonts.includes(requestedFont) ? requestedFont : 'Helvetica';
  const FONT_BOLD = FONT_REGULAR + '-Bold';
  const FONT_ITALIC = FONT_REGULAR + (FONT_REGULAR === 'Times-Roman' ? '-Italic' : '-Oblique');

  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Tax_Invoice_${invoice.invoice_number}.pdf"`);
  doc.pipe(res);

  function drawImageFromBase64(dataUrl: string, x: number, y: number, options: any) {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return false;
    try {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      doc.image(buffer, x, y, options);
      return true;
    } catch (e) {
      return false;
    }
  }

  const cGstinState = (company.gstin || '').trim().substring(0, 2);
  const clGstinState = (client.gstin || '').trim().substring(0, 2);
  const isIgst = Boolean(cGstinState && clGstinState && cGstinState !== clGstinState);
  const gstPercent = Number(invoice.gst_percent) || company.default_gst_rate || 0;
  const currencySymbol = company.currency === 'USD' ? '$' : (company.currency === 'EUR' ? '€' : 'Rs. ');

  function drawHeader() {
    let logoDrawn = false;
    let companyDetailsY = MARGIN;
    
    if (company.enable_logo !== false && company.logo_url) {
      logoDrawn = drawImageFromBase64(company.logo_url, MARGIN, MARGIN, { fit: [200, 60] });
      if (logoDrawn) {
        companyDetailsY = MARGIN + 70;
      }
    }
    
    if (!logoDrawn) {
      // Fallback stylized box
      const logoSize = 42;
      doc.roundedRect(MARGIN, MARGIN, logoSize, logoSize, 8).fill(COLOR_PRIMARY);
      const initial = (company.company_name || 'C').substring(0, 1).toUpperCase();
      doc.font(FONT_BOLD).fontSize(22).fillColor('#FFFFFF').text(initial, MARGIN, MARGIN + 10, { width: logoSize, align: 'center' });
      doc.font(FONT_BOLD).fontSize(16).fillColor(COLOR_PRIMARY).text(company.legal_name || company.company_name || 'Your Company', MARGIN + 55, MARGIN - 2);
      companyDetailsY = MARGIN + 45;
    }

    const companyX = MARGIN;
    doc.font(FONT_REGULAR).fontSize(8.5).fillColor(COLOR_GREY);
    
    const addressBlock = [company.address, company.city, company.state, company.country, company.pincode].filter(Boolean).join(', ');
    if (addressBlock) {
      doc.text(addressBlock, companyX, companyDetailsY, { width: 300 });
      companyDetailsY = doc.y + 2;
    }
    
    const contactLine = [];
    if (company.phone || company.alt_phone) contactLine.push(`Ph: ${company.phone || company.alt_phone}`);
    if (company.support_email || company.email) contactLine.push(`${company.support_email || company.email}`);
    if (company.website) contactLine.push(`${company.website}`);
    if (contactLine.length > 0) {
      doc.text(contactLine.join('  |  '), companyX, companyDetailsY, { width: 300 });
      companyDetailsY = doc.y + 2;
    }
    
    doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_DARK);
    const taxLines = [];
    if (company.gstin) taxLines.push(`GSTIN: ${company.gstin}`);
    if (company.pan) taxLines.push(`PAN: ${company.pan}`);
    if (company.cin) taxLines.push(`CIN: ${company.cin}`);
    if (company.msme_no) taxLines.push(`MSME: ${company.msme_no}`);
    if (taxLines.length > 0) {
      doc.text(taxLines.join('  |  '), companyX, companyDetailsY, { width: 300 });
    }
    
    const leftBottomY = doc.y;

    // Top Right: Invoice Details
    const rightBoxW = 200;
    const rightBoxX = PAGE_WIDTH - MARGIN - rightBoxW;
    
    doc.font(FONT_BOLD).fontSize(24).fillColor(COLOR_PRIMARY).text('TAX INVOICE', rightBoxX, MARGIN - 4, { align: 'right', width: rightBoxW });
    
    // Display invoice number directly (prefix + padding logic should ideally be applied during creation)
    doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_GREY).text(`INV NO: ${invoice.invoice_number}`, rightBoxX, MARGIN + 22, { align: 'right', width: rightBoxW });

    const tableY = MARGIN + 40;
    doc.font(FONT_REGULAR).fontSize(8.5).fillColor(COLOR_GREY);
    let ry = tableY;
    
    const addRightField = (label: string, val: string) => {
      doc.font(FONT_REGULAR).fillColor(COLOR_GREY).text(label, rightBoxX + 20, ry);
      doc.font(FONT_BOLD).fillColor(COLOR_DARK).text(val, rightBoxX + 100, ry, { width: 100, align: 'right' });
      ry += 12;
    };

    addRightField('Invoice Date:', invoice.issue_date || '-');
    addRightField('Due Date:', invoice.due_date || '-');
    addRightField('Place of Supply:', invoice.place_of_supply || (client.state ? `${client.state} (${clGstinState})` : company.place_of_supply || '-'));
    if (company.reverse_charge) addRightField('Reverse Charge:', 'Yes');
    addRightField('Status:', invoice.status || 'Unpaid');
    
    return Math.max(leftBottomY, ry);
  }

  function drawCustomerDetails(startY: number) {
    const y = startY; 
    const boxW = (CONTENT_WIDTH - 15) / 2;
    const boxH = 140; // Increased height to prevent overflow
    
    doc.moveTo(MARGIN, y - 8).lineTo(PAGE_WIDTH - MARGIN, y - 8).stroke(COLOR_BORDER);

    // BILL TO
    doc.roundedRect(MARGIN, y, boxW, boxH, 6).stroke(COLOR_BORDER);
    doc.save();
    doc.roundedRect(MARGIN, y, boxW, 22, 6).clip();
    doc.rect(MARGIN, y, boxW, 22).fillAndStroke(COLOR_BLUE_BG, COLOR_BORDER);
    doc.restore();
    
    doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_PRIMARY).text('BILL TO', MARGIN + 12, y + 7);
    
    let billY = y + 30;
    doc.font(FONT_BOLD).fontSize(10).fillColor(COLOR_DARK).text(client.company_name || client.name || '', MARGIN + 12, billY);
    billY += 14;
    
    doc.font(FONT_REGULAR).fontSize(8.5).fillColor(COLOR_GREY);
    if (client.address) { 
      doc.text(client.address, MARGIN + 12, billY, { width: boxW - 24 }); 
      billY = doc.y + 4; 
    }
    
    const addBillField = (label: string, val: string) => {
      if (!val) return;
      doc.font(FONT_BOLD).fillColor(COLOR_GREY).text(label, MARGIN + 12, billY);
      doc.font(FONT_BOLD).fillColor(COLOR_DARK).text(': ' + val, MARGIN + 50, billY);
      billY += 12;
    };
    addBillField('Phone', client.phone);
    addBillField('Email', client.email);
    addBillField('GSTIN', client.gstin);

    // PROJECT DETAILS
    const otherX = MARGIN + boxW + 15;
    doc.roundedRect(otherX, y, boxW, boxH, 6).stroke(COLOR_BORDER);
    doc.save();
    doc.roundedRect(otherX, y, boxW, 22, 6).clip();
    doc.rect(otherX, y, boxW, 22).fillAndStroke(COLOR_BLUE_BG, COLOR_BORDER);
    doc.restore();
    
    doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_PRIMARY).text('PROJECT & BILLING DETAILS', otherX + 12, y + 7);
    
    let otherY = y + 30;
    const addOtherField = (label: string, val: string) => {
      doc.font(FONT_REGULAR).fillColor(COLOR_GREY).text(label, otherX + 12, otherY);
      doc.font(FONT_BOLD).fillColor(COLOR_DARK).text(': ' + val, otherX + 90, otherY, { width: boxW - 100 });
      otherY = doc.y + 4;
    };
    
    addOtherField('Project Type', company.business_type || 'IT Services / Software');
    addOtherField('Billing Period', invoice.issue_date || '-');
    addOtherField('Payment Terms', company.payment_terms || 'Immediate');
    addOtherField('Remarks', invoice.notes || company.invoice_notes || '-');

    doc.y = y + boxH + 15;
  }

  // Table Configuration for optimal fit
  const colXs = { 
    sr: MARGIN, 
    desc: MARGIN + 25, 
    sac: MARGIN + 300, 
    qty: MARGIN + 360, 
    unit: MARGIN + 410, 
    rate: MARGIN + 460
  };

  function drawTableHeader() {
    const startY = doc.y;
    doc.rect(MARGIN, startY, CONTENT_WIDTH, 32).fillAndStroke(COLOR_BLUE_BG, COLOR_BORDER);
    doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_PRIMARY);
    const textY = startY + 11;
    
    doc.text('Sr.', colXs.sr + 5, textY);
    doc.text('Service Description', colXs.desc + 5, textY);
    doc.text('SAC/HSN', colXs.sac, textY, { width: 50, align: 'center' });
    doc.text('Qty', colXs.qty, textY, { width: 40, align: 'center' });
    doc.text('Unit', colXs.unit, textY, { width: 40, align: 'center' });
    doc.text('Rate', colXs.rate, textY, { width: CONTENT_WIDTH - (colXs.rate - MARGIN) - 5, align: 'right' });
    
    // Fix gap issue by setting doc.y exactly to the bottom of the table header
    doc.y = startY + 32;
  }

  function checkPageBreak(requiredHeight: number) {
    if (doc.y + requiredHeight > PAGE_HEIGHT - MARGIN - 180) {
      doc.addPage();
      drawTableHeader();
    }
  }

  const headerBottomY = drawHeader();
  drawCustomerDetails(headerBottomY + 25);
  drawTableHeader();

  let tableTotalGst = 0;
  let tableTotalTaxable = 0;
  let isEven = false;

  lineItems.forEach((item, index) => {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxableAmount = qty * rate;
    const itemGst = taxableAmount * (gstPercent / 100);
    const itemTotal = taxableAmount + itemGst;

    tableTotalTaxable += taxableAmount;
    tableTotalGst += itemGst;

    const descWidth = colXs.sac - colXs.desc - 10;
    doc.font(FONT_REGULAR).fontSize(8.5);
    const textHeight = doc.heightOfString(item.description || '-', { width: descWidth });
    const rowHeight = Math.max(28, textHeight + 14);
    
    checkPageBreak(rowHeight);

    const startY = doc.y;

    if (isEven) {
      doc.rect(MARGIN, startY, CONTENT_WIDTH, rowHeight).fill('#F9FAFB');
    }
    isEven = !isEven;
    
    doc.rect(MARGIN, startY, CONTENT_WIDTH, rowHeight).stroke(COLOR_BORDER);
    
    Object.values(colXs).forEach((colX) => {
      if (colX !== MARGIN) {
        doc.moveTo(colX, startY).lineTo(colX, startY + rowHeight).stroke(COLOR_BORDER);
      }
    });

    doc.fillColor(COLOR_DARK);
    const textY = startY + 8;
    
    doc.font(FONT_BOLD).text(String(index + 1), colXs.sr, textY, { width: 25, align: 'center' });
    doc.font(FONT_REGULAR).text(item.description || '-', colXs.desc + 5, textY, { width: descWidth });
    doc.text(company.default_sac || '-', colXs.sac, textY, { width: 50, align: 'center' });
    doc.text(qty.toString(), colXs.qty, textY, { width: 40, align: 'center' });
    doc.text('NOS', colXs.unit, textY, { width: 40, align: 'center' });
    doc.text(rate.toLocaleString('en-US', { minimumFractionDigits: 2 }), colXs.rate, textY, { width: CONTENT_WIDTH - (colXs.rate - MARGIN) - 5, align: 'right' });
    
    doc.y = startY + rowHeight;
  });

  checkPageBreak(180);
  
  const summaryY = doc.y + 15;
  const leftBoxW = CONTENT_WIDTH - 240;

  let leftY = summaryY;
  
  if (company.show_amount_in_words !== false) {
    doc.roundedRect(MARGIN, leftY, leftBoxW, 35, 6).fillAndStroke(COLOR_BLUE_BG, COLOR_BORDER);
    doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_GREY).text(`TOTAL AMOUNT IN WORDS (${company.currency || 'INR'})`, MARGIN + 12, leftY + 8);
    // Hardcoding 'Rupees' might be incorrect if currency is USD. So:
    const prefix = company.currency === 'USD' ? 'Dollars' : (company.currency === 'EUR' ? 'Euros' : 'Rupees');
    doc.font(FONT_BOLD).fontSize(9.5).fillColor(COLOR_DARK).text(`${prefix} ${numberToWords(Number(invoice.total))}`, MARGIN + 12, leftY + 19, { width: leftBoxW - 24 });
    leftY += 45;
  }

  // Bank Details
  if (company.bank_account_number || company.bank_name || company.ifsc) {
    doc.roundedRect(MARGIN, leftY, leftBoxW, 95, 6).stroke(COLOR_BORDER);
    
    doc.save();
    doc.roundedRect(MARGIN, leftY, leftBoxW, 22, 6).clip();
    doc.rect(MARGIN, leftY, leftBoxW, 22).fillAndStroke(COLOR_BLUE_BG, COLOR_BORDER);
    doc.restore();

    doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_PRIMARY).text('BANK & PAYMENT DETAILS', MARGIN + 12, leftY + 6);
    
    // QR Code rendering
    if (company.enable_qr !== false && company.qr_url) {
      const qrSize = 55;
      const qrX = MARGIN + leftBoxW - 65;
      const qrY = leftY + 30;
      doc.roundedRect(qrX, qrY, qrSize, qrSize, 4).stroke(COLOR_BORDER);
      
      const qrDrawn = drawImageFromBase64(company.qr_url, qrX + 2, qrY + 2, { fit: [qrSize - 4, qrSize - 4] });
      
      if (!qrDrawn) {
        doc.font(FONT_BOLD).fontSize(7).fillColor(COLOR_LIGHT_GREY).text('SCAN & PAY', qrX, qrY + 25, { width: qrSize, align: 'center' });
      }
    }
    
    let by = leftY + 30;
    const addBankField = (label: string, val: string) => {
      if (!val) return;
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor(COLOR_GREY).text(label, MARGIN + 12, by);
      doc.font(FONT_BOLD).fillColor(COLOR_DARK).text(': ' + val, MARGIN + 80, by);
      by += 12;
    };
    
    addBankField('Bank Name', company.bank_name);
    addBankField('Account Name', company.bank_account_name);
    addBankField('Account No.', company.bank_account_number);
    addBankField('IFSC Code', company.ifsc);
    addBankField('UPI ID', company.upi_id);
    addBankField('Swift Code', company.swift_code);
  }

  // Right Side: Summary Box
  const totalBoxW = 225;
  const totalBoxX = PAGE_WIDTH - MARGIN - totalBoxW;
  let tY = summaryY;

  doc.roundedRect(totalBoxX, tY, totalBoxW, 140, 6).stroke(COLOR_BORDER);

  function drawTotalRow(label: string, amount: number, isBold: boolean = false, isLast: boolean = false) {
    doc.font(isBold ? FONT_BOLD : FONT_REGULAR).fontSize(9.5).fillColor(COLOR_DARK);
    doc.text(label, totalBoxX + 15, tY + 8, { width: 120 });
    doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), totalBoxX + 130, tY + 8, { width: 80, align: 'right' });
    if (!isLast) {
      doc.moveTo(totalBoxX, tY + 25).lineTo(totalBoxX + totalBoxW, tY + 25).stroke(COLOR_BORDER);
    }
    tY += 25;
  }

  drawTotalRow('Sub Total', tableTotalTaxable);
  
  const discount = Number(invoice.discount) || 0;
  drawTotalRow('Discount', discount);
  drawTotalRow('Taxable Amount', tableTotalTaxable - discount);

  if (isIgst) {
    drawTotalRow(`IGST (${gstPercent}%)`, tableTotalGst);
  } else {
    drawTotalRow(`CGST (${gstPercent / 2}%)`, tableTotalGst / 2);
    drawTotalRow(`SGST (${gstPercent / 2}%)`, tableTotalGst / 2);
    tY += 25; 
  }
  
  // Conditionally round off
  let grandTotal = Number(invoice.total);
  if (company.round_off !== false) {
    const rawTotal = tableTotalTaxable - discount + tableTotalGst;
    const rounded = Math.round(rawTotal);
    const diff = rounded - rawTotal;
    if (diff !== 0) drawTotalRow('Round Off', diff, false, true);
    grandTotal = rounded;
  } else {
    drawTotalRow('Round Off', 0, false, true);
  }

  // Grand Total Gradient Box
  const grad = doc.linearGradient(totalBoxX, tY, totalBoxX + totalBoxW, tY + 34);
  grad.stop(0, COLOR_PRIMARY).stop(1, COLOR_ACCENT);

  doc.save();
  doc.roundedRect(totalBoxX, tY, totalBoxW, 34, 6).clip();
  doc.rect(totalBoxX, tY, totalBoxW, 34).fill(grad);
  doc.restore();
  
  doc.font(FONT_BOLD).fontSize(11).fillColor('#FFFFFF');
  doc.text(`GRAND TOTAL (${company.currency || 'INR'})`, totalBoxX + 15, tY + 11, { width: 120 });
  doc.text(`${currencySymbol} ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, totalBoxX + 120, tY + 10, { width: 90, align: 'right' });

  // -----------------------------------------
  // Bottom Section: Absolute positioning
  // -----------------------------------------
  let bottomY = PAGE_HEIGHT - MARGIN - 150; 
  if (doc.y > bottomY - 10) {
    doc.addPage();
    bottomY = PAGE_HEIGHT - MARGIN - 150;
  }

  const sectionW = (CONTENT_WIDTH - 20) / 2;

  // Declaration
  if (company.declaration_text) {
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_PRIMARY).text('DECLARATION', MARGIN, bottomY);
    doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK).text(
      company.declaration_text,
      MARGIN, bottomY + 12, { width: sectionW }
    );
  }

  // Terms & Conditions
  if (company.payment_terms || company.invoice_notes) {
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLOR_PRIMARY).text('TERMS & CONDITIONS', MARGIN, bottomY + 45);
    doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_DARK);
    
    // Mix terms and notes
    const tcLines = [
      `1. Payment Terms: ${company.payment_terms || 'Immediate'}`,
      company.invoice_notes ? `2. ${company.invoice_notes}` : '2. All disputes are subject to local jurisdiction only.',
      '3. This is a computer generated invoice and does not require physical signature.'
    ];
    tcLines.forEach((line, i) => {
      doc.text(line, MARGIN, bottomY + 57 + (i * 11), { width: sectionW });
    });
  }

  // Stamp & Signature (Right side)
  const sigY = bottomY + 30;
  
  // Seal / Stamp
  const stampX = PAGE_WIDTH - MARGIN - 190;
  let stampDrawn = false;
  if (company.enable_stamp !== false && company.stamp_url) {
    stampDrawn = drawImageFromBase64(company.stamp_url, stampX + 5, sigY, { fit: [60, 60] });
  }
  
  if (!stampDrawn && company.enable_stamp !== false) {
    // Left intentionally blank for manual stamping
  }

  // Digital Signature
  doc.font(FONT_BOLD).fontSize(9).fillColor(COLOR_DARK).text('For ' + (company.legal_name || company.company_name || 'Company'), PAGE_WIDTH - MARGIN - 140, bottomY, { align: 'right', width: 140 });
  
  let sigDrawn = false;
  if (company.enable_signature !== false && company.signature_url) {
    sigDrawn = drawImageFromBase64(company.signature_url, PAGE_WIDTH - MARGIN - 120, sigY + 5, { fit: [120, 35] });
  }
  
  if (!sigDrawn && company.enable_signature !== false) {
    // Left intentionally blank for manual signature
  }
  
  doc.moveTo(PAGE_WIDTH - MARGIN - 140, sigY + 45).lineTo(PAGE_WIDTH - MARGIN, sigY + 45).stroke(COLOR_BORDER);
  doc.font(FONT_REGULAR).fontSize(8).fillColor(COLOR_GREY).text('Authorized Signatory', PAGE_WIDTH - MARGIN - 140, sigY + 50, { align: 'right', width: 140 });

  // Footer Center
  const footerY = PAGE_HEIGHT - MARGIN - 15;
  doc.moveTo(MARGIN, footerY - 12).lineTo(PAGE_WIDTH - MARGIN, footerY - 12).stroke(COLOR_PRIMARY);
  
  doc.font(FONT_ITALIC).fontSize(9).fillColor(COLOR_PRIMARY).text(
    company.invoice_footer || 'Thank You For Your Business!',
    MARGIN, footerY - 5,
    { align: 'center', width: CONTENT_WIDTH }
  );

  doc.font(FONT_REGULAR).fontSize(7.5).fillColor(COLOR_LIGHT_GREY).text(
    'This is a Computer Generated GST Tax Invoice.',
    MARGIN, footerY + 6,
    { align: 'center', width: CONTENT_WIDTH }
  );

  doc.end();
}
