export const safeText = value => String(value ?? '').trim();

export const dash = value => safeText(value) || '-';

export const formatCurrency = value => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const initialsFor = name => {
  const text = safeText(name);
  if (!text) return 'NA';
  return text.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
};

// Fees are billed per quarter, so the billing period key is the quarter the
// date falls in — "2026-Q3" — matching the keys the backend generates.
export const currentMonthLabel = () => {
  const now = new Date();
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
};

export const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
};

export const quarterKeyForDate = value => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
};

export const parseAmount = value => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;

export const roundToPaise = value => Math.round((Number(value) || 0) * 100) / 100;

export const amountsEqual = (a, b) => Math.abs(roundToPaise(a) - roundToPaise(b)) < 0.005;

export const dateInputValue = date => date.toISOString().slice(0, 10);
