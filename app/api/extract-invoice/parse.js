// Pure, dependency-free field extraction from raw invoice text.
// Kept separate from route.js so it can be unit-tested without OCR/HTTP.
// Extracts only the four fields TradeFlow needs: supplier, buyer, amount, currency.

const CURRENCY_CODES = ["RLUSD", "USD", "EUR", "CHF", "GBP", "JPY", "AUD", "CAD"];

// Company-name suffixes used as a strong signal for supplier/buyer org names.
const ORG_SUFFIX =
  "(?:AG|GmbH|Ltd\\.?|Limited|LLC|L\\.L\\.C\\.|Inc\\.?|Incorporated|Co\\.?|Company|" +
  "S\\.?A\\.?|S\\.?r\\.?l\\.?|S\\.?A\\.?R\\.?L\\.?|B\\.?V\\.?|N\\.?V\\.?|Pte\\.?|PLC|Corp\\.?|Corporation)";

// A loose money token: digit runs with US/EU/Swiss separators. No spaces, so
// two separate numbers never merge into one.
const NUM_RE = /\d[\d.,'’’]*\d|\d/g;

export function detectCurrency(text) {
  const upper = (text || "").toUpperCase();
  for (const code of CURRENCY_CODES) {
    if (new RegExp(`\\b${code}\\b`).test(upper)) return code;
  }
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  if (/\bFr\.?\b/.test(text)) return "CHF";
  if (text.includes("$")) return "USD";
  return null;
}

// Normalize a raw money token to a Number, handling US (50,000.00),
// EU (50.000,00) and Swiss (50'000.00) thousands/decimal conventions.
export function normalizeAmount(raw) {
  if (raw == null) return null;
  let s = String(raw).replace(/[’'’\s]/g, ""); // strip apostrophes (incl. Swiss ’) + spaces
  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", "."); // EU: 50.000,00
    } else {
      s = s.replace(/,/g, ""); // US: 50,000.00
    }
  } else if (hasComma) {
    if (/,\d{1,2}$/.test(s)) s = s.replace(",", "."); // decimal comma: 50000,00
    else s = s.replace(/,/g, ""); // thousands: 50,000
  } else if (hasDot) {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1 || (/\.\d{3}\b/.test(s) && !/\.\d{2}$/.test(s))) {
      s = s.replace(/\./g, ""); // dots are thousands separators: 50.000 / 1.234.567
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Pick the invoice total. Prefer numbers on lines anchored by total-type
// keywords (largest wins → grand total over subtotal); else the largest
// number anywhere as a fallback.
export function detectAmount(text) {
  const lines = (text || "").split(/\r?\n/);
  const KW =
    /(amount\s*due|balance\s*due|grand\s*total|total\s*due|gesamtbetrag|rechnungsbetrag|montant\s*total|importe\s*total|\btotal\b|\btotale\b)/i;

  const numbersFrom = (filter) => {
    const out = [];
    for (const line of lines) {
      if (filter && !filter.test(line)) continue;
      const matches = line.match(NUM_RE);
      if (matches) {
        for (const m of matches) {
          const v = normalizeAmount(m);
          if (v != null) out.push(v);
        }
      }
    }
    return out;
  };

  const keyworded = numbersFrom(KW);
  if (keyworded.length) return { value: Math.max(...keyworded), method: "keyword" };

  const all = numbersFrom(null);
  if (all.length) return { value: Math.max(...all), method: "max" };

  return { value: null, method: "none" };
}

// Document headings / labels that may sit immediately before a real org name.
const NOISE_WORDS = new Set([
  "INVOICE", "BILL", "TO", "FROM", "SHIP", "SOLD", "BY", "FOR", "CUSTOMER", "CLIENT",
  "SUPPLIER", "SELLER", "BUYER", "VENDOR", "TOTAL", "SUBTOTAL", "BALANCE", "AMOUNT",
  "DESCRIPTION", "QTY", "DATE", "NO", "NUMBER", "REF", "RECHNUNG", "LIEFERANT",
  "FACTURE", "FACTURA",
]);

function cleanOrgName(name) {
  const words = name.replace(/\s+/g, " ").trim().split(" ");
  while (words.length > 2 && NOISE_WORDS.has(words[0].toUpperCase().replace(/[^A-Z]/g, ""))) {
    words.shift();
  }
  return words.join(" ");
}

export function findOrgs(text) {
  const word = "[A-Za-zÀ-ÖØ-öø-ÿ0-9&.'’\\-]";
  const lead = "[A-ZÀ-ÖØ-Þ]";
  const re = new RegExp(
    `(${lead}${word}*(?:\\s+[A-Z0-9À-ÖØ-Þ]${word}*){0,4}\\s+${ORG_SUFFIX})\\b`,
    "g",
  );
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const name = cleanOrgName(m[1]);
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ name, index: m.index });
    }
  }
  return out;
}

// Nearest org name appearing at/after a keyword (within a window).
function orgNearKeyword(text, keywordRe, orgs) {
  const m = keywordRe.exec(text);
  if (!m) return null;
  const start = m.index;
  let best = null;
  let bestDist = Infinity;
  for (const o of orgs) {
    const d = o.index - start;
    if (d >= 0 && d < 250 && d < bestDist) {
      bestDist = d;
      best = o;
    }
  }
  return best ? best.name : null;
}

// Buyer (recipient) label variants across invoice/receipt formats, plus a few
// non-English ones. Multi-word labels come before their shorter forms so the
// longer one wins (JS alternation is first-match, not longest-match).
const BUYER_LABELS =
  /(bill(?:ed)?\s*to|sold\s*to|ship(?:ped)?\s*to|deliver(?:ed)?\s*to|invoice[d]?\s*to|customer\s*name|account\s*name|buyer|customer|client|purchaser|consignee|recipient|payer|rechnung\s*an|kunde|factur[eé]\s*[àa]|cliente|destinatario)\s*[:\-]?/i;

// Supplier (issuer/payee) label variants. Bare "from" is left out to avoid
// false hits; the top-of-invoice org covers that case.
const SUPPLIER_LABELS =
  /(supplier|seller|sold\s*by|bill\s*from|vendor|issued\s*by|remit\s*to|pay\s*to|payee|beneficiary|lieferant|fournisseur|proveedor|fornitore)\s*[:\-]?/i;

// First meaningful line at/after a label. Handles "Bill To: Name" on one line
// and "Bill To:" with the name on the next line; skips blanks, other labels,
// and address-like lines that start with a number. Catches names with no
// company suffix that findOrgs would miss.
function lineAfterLabel(text, labelRe) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(labelRe);
    if (!m) continue;
    const sameLine = lines[i].slice(m.index + m[0].length).replace(/^[\s:\-]+/, "").trim();
    const candidates = [sameLine, ...lines.slice(i + 1, i + 4).map((l) => l.trim())];
    for (const c of candidates) {
      if (c && c.length > 1 && !/^\d/.test(c) && !labelRe.test(c)) {
        return c.replace(/\s{2,}/g, " ").slice(0, 60);
      }
    }
  }
  return null;
}

export function extractFields(text) {
  const clean = (text || "").replace(/ /g, " ");
  const orgs = findOrgs(clean);

  const supplier =
    orgNearKeyword(clean, SUPPLIER_LABELS, orgs) ||
    (orgs[0] ? orgs[0].name : null) ||
    lineAfterLabel(clean, SUPPLIER_LABELS);

  let buyer =
    orgNearKeyword(clean, BUYER_LABELS, orgs) ||
    lineAfterLabel(clean, BUYER_LABELS);

  // Avoid supplier and buyer collapsing to the same org.
  if (buyer && supplier && buyer === supplier) {
    const alt = orgs.find((o) => o.name !== supplier);
    buyer = alt ? alt.name : buyer;
  }
  if (!buyer && orgs.length > 1) {
    const alt = orgs.find((o) => o.name !== supplier);
    buyer = alt ? alt.name : null;
  }

  const amount = detectAmount(clean);
  const currency = detectCurrency(clean);

  const fields = {
    supplier: supplier || null,
    buyer: buyer || null,
    amount: amount.value,
    currency: currency || null,
  };

  return {
    fields,
    meta: {
      amountMethod: amount.method,
      orgsFound: orgs.map((o) => o.name),
      missing: Object.keys(fields).filter((k) => fields[k] == null),
    },
  };
}
