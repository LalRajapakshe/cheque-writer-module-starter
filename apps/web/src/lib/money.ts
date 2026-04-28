export function formatMoney(amount: number, currencyCode = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ones[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(tens[Math.floor(n / 10)]);
    n %= 10;
  } else if (n >= 10) {
    parts.push(teens[n - 10]);
    n = 0;
  }
  if (n > 0) parts.push(ones[n]);
  return parts.join(" ");
}

export function amountToWords(amount: number, currency = "Rupees") {
  const whole = Math.floor(amount || 0);
  if (whole === 0) return `Zero ${currency} Only`;
  const groups = [
    { value: 10000000, label: "Crore" },
    { value: 100000, label: "Lakh" },
    { value: 1000, label: "Thousand" },
    { value: 1, label: "" },
  ];
  let rest = whole;
  const parts: string[] = [];
  for (const group of groups) {
    const value = Math.floor(rest / group.value);
    if (value > 0) {
      parts.push(`${underThousand(value)} ${group.label}`.trim());
      rest %= group.value;
    }
  }
  return `${parts.join(" ")} ${currency} Only`;
}
