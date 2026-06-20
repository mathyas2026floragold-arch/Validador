export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validateLength(cardNumber) {
  return cardNumber.length >= 12 && cardNumber.length <= 19;
}

export function luhnCheck(cardNumber) {
  const digits = onlyDigits(cardNumber);
  if (!validateLength(digits)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function maskCard(cardNumber) {
  const digits = onlyDigits(cardNumber);
  const bin = digits.length >= 8 ? digits.slice(0, 8) : digits.slice(0, 6);
  const last4 = digits.length >= 4 ? digits.slice(-4) : '';
  if (!bin || !last4) return '';
  return `${bin}${'*'.repeat(Math.max(4, digits.length - bin.length - last4.length))}${last4}`;
}

export function extractBins(cardNumber) {
  const digits = onlyDigits(cardNumber);
  return {
    bin8: digits.length >= 8 ? digits.slice(0, 8) : null,
    bin6: digits.length >= 6 ? digits.slice(0, 6) : null,
    last4: digits.length >= 4 ? digits.slice(-4) : null
  };
}

export function detectBrand(cardNumber) {
  const n = onlyDigits(cardNumber);
  const len = n.length;

  // American Express: 34, 37 — 15 dígitos
  if (/^3[47]/.test(n) && len === 15) return 'American Express';

  // Visa: começa com 4 — 13, 16 ou 19 dígitos
  if (/^4/.test(n) && [13, 16, 19].includes(len)) return 'Visa';

  // Mastercard: 51-55 ou 2221-2720 — 16 dígitos
  const first2 = Number(n.slice(0, 2));
  const first4 = Number(n.slice(0, 4));
  if (len === 16 && ((first2 >= 51 && first2 <= 55) || (first4 >= 2221 && first4 <= 2720))) {
    return 'Mastercard';
  }

  // Discover: 6011, 65, 644-649 — 16 a 19 dígitos
  const first3 = Number(n.slice(0, 3));
  if ((/^6011/.test(n) || /^65/.test(n) || (first3 >= 644 && first3 <= 649)) && len >= 16 && len <= 19) {
    return 'Discover';
  }

  // JCB: 3528-3589 — 16 a 19 dígitos
  if (first4 >= 3528 && first4 <= 3589 && len >= 16 && len <= 19) return 'JCB';

  // Diners Club: 300-305, 36, 38, 39 — 14 a 19 dígitos
  if (((first3 >= 300 && first3 <= 305) || /^3[689]/.test(n)) && len >= 14 && len <= 19) return 'Diners Club';

  // Elo: principais ranges públicos. Pode ser complementado por tabela própria.
  const eloPrefixes = [
    '401178', '401179', '431274', '438935', '451416', '457393', '457631', '457632',
    '504175', '506699', '506700', '509000', '627780', '636297', '636368', '650031',
    '650032', '650033', '650035', '650036', '650037', '650038', '650039', '655000', '655001'
  ];
  if (eloPrefixes.some(prefix => n.startsWith(prefix)) && len >= 16 && len <= 19) return 'Elo';

  // Hipercard: padrões mais comuns no Brasil.
  if ((/^606282/.test(n) || /^3841/.test(n) || /^3842/.test(n) || /^3843/.test(n)) && len >= 13 && len <= 19) {
    return 'Hipercard';
  }

  return 'Desconhecida';
}

export function safeCardPayload(cardNumber) {
  const digits = onlyDigits(cardNumber);
  const bins = extractBins(digits);

  return {
    digits,
    isLengthValid: validateLength(digits),
    luhn: luhnCheck(digits),
    brand: detectBrand(digits),
    bin8: bins.bin8,
    bin6: bins.bin6,
    last4: bins.last4,
    masked: maskCard(digits)
  };
}
