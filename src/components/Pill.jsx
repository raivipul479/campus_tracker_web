import React from 'react';

export function Pill({ children, tone }) {
  return <span className={`pill ${tone || String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>;
}
