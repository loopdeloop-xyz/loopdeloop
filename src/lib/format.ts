export function fmtUnits(value: bigint, decimals: number, dp = 4): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, dp).replace(/0+$/, '');
  const out = fracStr ? `${whole}.${fracStr}` : whole.toString();
  return neg ? `-${out}` : out;
}

export function fmtUsd(value: bigint, decimals: number, dp = 2): string {
  return `$${fmtUnits(value, decimals, dp)}`;
}

export function fmtPct(rate: number, dp = 2): string {
  return `${(rate * 100).toFixed(dp)}%`;
}

export function parseUnits(input: string, decimals: number): bigint {
  if (!input) return 0n;
  const trimmed = input.trim();
  if (!/^\d*\.?\d*$/.test(trimmed)) throw new Error('invalid number');
  const [whole = '0', frac = ''] = trimmed.split('.');
  const fracPadded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(fracPadded || '0');
}

export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
