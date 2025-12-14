import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCategoryDisplayName = (category: any, locale: string) => {
  if (category.translations && category.translations.length > 0) {
    // Try exact match first (e.g. 'pt-BR' or 'pt')
    const exact = category.translations.find((t: any) => t.language === locale);
    if (exact) return exact.name;

    // Try language group (e.g. 'pt' matching 'pt-BR')
    const group = category.translations.find((t: any) => t.language.startsWith(locale.split('-')[0]));
    if (group) return group.name;

    // Fallback
    return category.translations[0].name;
  }
  return category.name;
};

export const formatCurrency = (amount: number | string, locale: string = 'en-US', currency: string = 'BRL') => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(value)) return amount.toString();

  // Map simplified locales to full locales for Intl
  const localeMap: Record<string, string> = {
    'pt': 'pt-BR',
    'en': 'en-US',
    'es': 'es-ES'
  };

  const fullLocale = localeMap[locale] || locale;

  // Adjust currency based on locale if not explicitly provided (optional heuristic)
  // But user stated they selected Real Brasileiro, so we might want to default to that or respect a potential currency param.
  // For now, let's stick to the requested behavior: show correct symbol (BRL -> R$).
  // If the user's project is single-currency or supports multiple, the currency code should ideally come from the transaction or user settings.
  // Given the prompt "o simbulo da moeda que selecionei foi o real brasilerio, mas esta aparecendo o dollar americano", 
  // it implies the currency should be BRL.

  return new Intl.NumberFormat(fullLocale, {
    style: 'currency',
    currency: currency,
  }).format(value);
};

export const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
