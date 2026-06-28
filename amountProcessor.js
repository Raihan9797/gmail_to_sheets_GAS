const UNKNOWN_CURRENCY = "UnknownCCY"

/**
 * Normalizes dirty amount strings into a consistent numeric value.
 * Handles formats like: "THB 5,654.17", "SGD566.55", "INR 10200.00"
 * Removes anything that is not digits or decimal point
 */
function cleanAmountString(rawAmount) {
  if (!rawAmount || rawAmount === UNKNOWN_AMOUNT) return UNKNOWN_AMOUNT;
  const numericString = rawAmount.replace(/[^0-9.]/g, '');
  const parsedAmount = parseFloat(numericString);
  return isNaN(parsedAmount) ? UNKNOWN_AMOUNT : parsedAmount;
}

/**
 * Extracts the 3-letter currency code (e.g., "SGD", "THB") from a raw string.
 * @param {string} rawAmount - The raw text matched from the parsedData
 * @return {string} The currency code, or UNKNOWN_CURRENCY if none found.
 */
function extractCurrency(rawAmount) {
  if (!rawAmount) return UNKNOWN_CURRENCY;
  const currencyMatch = rawAmount.match(/([a-zA-Z]{3})/); // include lowercase
  return currencyMatch ? currencyMatch[1] : UNKNOWN_CURRENCY;
}
