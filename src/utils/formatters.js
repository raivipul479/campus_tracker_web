export const safeText = value => String(value ?? '').trim();

export const dash = value => safeText(value) || '-';

export const formatCurrency = value => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const initialsFor = name => {
  const text = safeText(name);
  if (!text) return 'NA';
  return text.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
};

export const currentMonthLabel = () => new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });

export const currentMonthKey = () => `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

export const parseAmount = value => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;

export const dateInputValue = date => date.toISOString().slice(0, 10);
