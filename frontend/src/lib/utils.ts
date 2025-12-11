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
