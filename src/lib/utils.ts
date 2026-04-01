import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string): string {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

export function maskPhone(value: string): string {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
  value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  return value;
}

export function maskCurrency(value: string): string {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  value = (Number(value) / 100).toFixed(2) + '';
  value = value.replace('.', ',');
  value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return 'R$ ' + value;
}

export function parseCurrency(value: string): number {
  if (!value) return 0;
  return Number(value.replace(/\D/g, '')) / 100;
}
