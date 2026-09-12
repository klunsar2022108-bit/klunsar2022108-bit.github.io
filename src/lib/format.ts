export function formatPrice(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `NLe ${amount.toLocaleString("en-SL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
