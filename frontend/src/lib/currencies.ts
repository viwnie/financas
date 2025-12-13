export type Currency = {
    code: string;
    symbol: string;
    name: string;
    locale: string;
};

export const CURRENCIES: Currency[] = [
    { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
    { code: 'USD', symbol: '$', name: 'Dólar Americano', locale: 'en-US' },
    { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
    { code: 'GBP', symbol: '£', name: 'Libra Esterlina', locale: 'en-GB' },
    { code: 'JPY', symbol: '¥', name: 'Iene Japonês', locale: 'ja-JP' },
    { code: 'ARS', symbol: '$', name: 'Peso Argentino', locale: 'es-AR' },
    { code: 'BTC', symbol: '₿', name: 'Bitcoin', locale: 'pt-BR' },
    { code: 'ETH', symbol: 'Ξ', name: 'Ethereum', locale: 'pt-BR' },
    { code: 'USDT', symbol: '₮', name: 'Tether', locale: 'en-US' },
];

export function getCurrencySymbol(code: string): string {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

export function getCurrencyLocale(code: string): string {
    return CURRENCIES.find(c => c.code === code)?.locale || 'pt-BR';
}
