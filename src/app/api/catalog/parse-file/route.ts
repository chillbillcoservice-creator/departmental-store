import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText = '';

    if (fileName.endsWith('.pdf')) {
      // Dynamic import to prevent client bundling
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text || '';
    } else {
      // CSV or plain text
      rawText = buffer.toString('utf-8');
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'File appears to be empty or unreadable.' }, { status: 400 });
    }

    const items = parseTextToProducts(rawText, fileName.endsWith('.pdf'));

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: fileName.endsWith('.pdf') ? 'pdf' : 'csv',
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Error parsing catalog file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse file' },
      { status: 500 }
    );
  }
}

/**
 * Parses either structured CSV or tabular PDF invoice text into standardized products.
 */
function parseTextToProducts(text: string, isPdf: boolean) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const products: any[] = [];

  if (!isPdf) {
    // ── CSV Parsing ──
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('item') || h.includes('desc'));
    const catIdx = headers.findIndex(h => h.includes('cat'));
    const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('mrp') || h.includes('rate'));
    const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('purchase') || h.includes('buy'));
    const stockIdx = headers.findIndex(h => h.includes('stock') || h.includes('qty') || h.includes('quantity'));
    const barIdx = headers.findIndex(h => h.includes('bar') || h.includes('code') || h.includes('sku'));
    const hsnIdx = headers.findIndex(h => h.includes('hsn'));
    const unitIdx = headers.findIndex(h => h.includes('unit'));
    const minIdx = headers.findIndex(h => h.includes('min') || h.includes('capacity'));

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
      if (row.length === 0 || !row[nameIdx >= 0 ? nameIdx : 0]) continue;

      const name = nameIdx >= 0 ? row[nameIdx] : row[0];
      if (!name || name.length < 2) continue;

      products.push({
        name,
        category: catIdx >= 0 && row[catIdx] ? row[catIdx] : 'General',
        price: priceIdx >= 0 && parseFloat(row[priceIdx]) ? parseFloat(row[priceIdx]) : 0,
        costPrice: costIdx >= 0 && parseFloat(row[costIdx]) ? parseFloat(row[costIdx]) : 0,
        stock: stockIdx >= 0 && parseInt(row[stockIdx], 10) ? parseInt(row[stockIdx], 10) : 10,
        barcode: barIdx >= 0 && row[barIdx] ? row[barIdx] : '',
        hsnCode: hsnIdx >= 0 && row[hsnIdx] ? row[hsnIdx] : '',
        unit: unitIdx >= 0 && row[unitIdx] ? row[unitIdx] : 'Pack',
        capacity: minIdx >= 0 && parseInt(row[minIdx], 10) ? parseInt(row[minIdx], 10) : 5,
      });
    }
  } else {
    // ── PDF Distributor Invoice Line Item Extraction ──
    // Invoices commonly have lines like:
    // "1  Aashirvaad Atta 5kg  100199  10 BAG  220.00  245.00  2450.00"
    // "Maggi 2-Min Noodles 70g  120 PCS  11.50  14.00"
    for (const line of lines) {
      // Skip common invoice headers and footers
      if (/invoice|bill to|ship to|gstin|total|subtotal|balance|tax invoice|terms & conditions|signature|bank details|page \d+/i.test(line)) {
        continue;
      }

      // Look for numbers representing price/rate at the end of the line
      // E.g.: "Product Name ... 10 245.00"
      const tokens = line.split(/\s{2,}|\t|\|/); // split by multiple spaces, tabs, or pipes
      if (tokens.length >= 2) {
        let name = tokens[0].replace(/^\d+[\.\-\)]\s*/, '').trim(); // Remove leading serial number (e.g. "1.", "1 -")
        if (name.length < 3) {
          name = tokens[1]?.trim() || '';
        }

        if (name.length >= 3 && !/^\d+$/.test(name)) {
          // Find numerical values for price and stock
          const numbers = line.match(/\b\d+(\.\d{1,2})?\b/g)?.map(Number) || [];
          const validPrices = numbers.filter(n => n > 0 && n < 100000);

          if (validPrices.length >= 1) {
            const price = validPrices[validPrices.length - 1]; // usually last column is rate or total
            const costPrice = validPrices.length >= 2 ? validPrices[validPrices.length - 2] : Math.round(price * 0.85);
            const stock = validPrices.length >= 3 ? Math.round(validPrices[0]) : 10;

            // Check if there is an HSN code (4 to 8 digits)
            const hsnMatch = line.match(/\b(19\d{4}|21\d{4}|25\d{4}|33\d{4}|34\d{4}|84\d{4}|\d{4,8})\b/);

            products.push({
              name,
              category: inferCategory(name),
              price,
              costPrice: costPrice > price ? Math.round(price * 0.85) : costPrice,
              stock: stock > 0 && stock < 1000 ? stock : 10,
              barcode: '',
              hsnCode: hsnMatch ? hsnMatch[0] : '',
              unit: inferUnit(line),
              capacity: 5,
            });
          }
        }
      } else {
        // Single space separated line matching: "[Name] [Qty] [Price]"
        const match = line.match(/^([A-Za-z0-9\s\.\-\/\&]+?)\s+(\d+)\s*(pcs|pack|kg|ltr|gm|box|nos|bag)?\s+(\d+(?:\.\d{1,2})?)/i);
        if (match && match[1].length >= 3 && !/total|subtotal|tax|discount|invoice|date/i.test(match[1])) {
          const name = match[1].replace(/^\d+[\.\-\)]\s*/, '').trim();
          const stock = parseInt(match[2], 10) || 10;
          const unit = match[3] || 'Pack';
          const price = parseFloat(match[4]) || 0;

          if (price > 0) {
            products.push({
              name,
              category: inferCategory(name),
              price,
              costPrice: Math.round(price * 0.85),
              stock,
              barcode: '',
              hsnCode: '',
              unit,
              capacity: 5,
            });
          }
        }
      }
    }
  }

  return products;
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (/atta|rice|oil|dal|sugar|salt|flour|besan|sooji|spices|masala|ghee|mustard/i.test(n)) return 'Groceries & Staples';
  if (/milk|butter|cheese|paneer|dahi|curd|bread|egg|toast|corn flakes|oats/i.test(n)) return 'Dairy & Breakfast';
  if (/maggi|noodle|chips|kurkure|biscuit|cookie|chocolate|namkeen|bhujia|wafer|snack/i.test(n)) return 'Snacks & Packaged Foods';
  if (/tea|coffee|coke|pepsi|sprite|juice|frooti|water|soda|drink|beverage/i.test(n)) return 'Beverages';
  if (/soap|shampoo|paste|brush|cream|lotion|deo|dettol|dove|colgate/i.test(n)) return 'Personal Care & Hygiene';
  if (/surf|ariel|vim|lizol|harpic|colin|cleaner|detergent|dishwash|mosquito/i.test(n)) return 'Household & Cleaning';
  return 'General Departmental';
}

function inferUnit(text: string): string {
  const t = text.toLowerCase();
  if (/\b(kg|kilo|kilogram)\b/i.test(t)) return 'Kg';
  if (/\b(gm|g|gram)\b/i.test(t)) return 'Gram';
  if (/\b(ltr|litre|liter|ml)\b/i.test(t)) return 'Litre';
  if (/\b(pcs|piece|pc|nos)\b/i.test(t)) return 'Piece';
  if (/\b(box|carton|ctn)\b/i.test(t)) return 'Box';
  if (/\b(bag|sack)\b/i.test(t)) return 'Bag';
  return 'Pack';
}
