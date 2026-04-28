// Amount-to-words helper for Cheque Writer
// Format example:
// 315682.64 -> Three Hundred Fifteen Thousand Six Hundred Eighty Two Rupees and Sixty Four Cents Only

function numberToWords(num: number): string {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  if (num === 0) return "Zero";

  if (num < 20) return ones[num];

  if (num < 100) {
    return `${tens[Math.floor(num / 10)]}${num % 10 ? " " + ones[num % 10] : ""}`;
  }

  if (num < 1000) {
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? " " + numberToWords(num % 100) : ""}`;
  }

  if (num < 1000000) {
    return `${numberToWords(Math.floor(num / 1000))} Thousand${num % 1000 ? " " + numberToWords(num % 1000) : ""}`;
  }

  if (num < 1000000000) {
    return `${numberToWords(Math.floor(num / 1000000))} Million${num % 1000000 ? " " + numberToWords(num % 1000000) : ""}`;
  }

  return `${numberToWords(Math.floor(num / 1000000000))} Billion${num % 1000000000 ? " " + numberToWords(num % 1000000000) : ""}`;
}

export function amountToWords(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "Invalid Amount";
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const cents = Math.round((rounded - rupees) * 100);

  const rupeeWords = `${numberToWords(rupees)} Rupees`;

  if (cents > 0) {
    return `${rupeeWords} and ${numberToWords(cents)} Cents Only`;
  }

  return `${rupeeWords} Only`;
}
