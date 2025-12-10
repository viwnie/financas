
export class CategoryHelper {
    static resolveCategoryName(category: any, language: string = 'en') {
        if (!category.translations || category.translations.length === 0) return 'Unnamed';
        const targetLang = language.toLowerCase();
        const baseLang = targetLang.split('-')[0];

        // 1. Exact match
        const exact = category.translations.find((t: any) => t.language.toLowerCase() === targetLang);
        if (exact) return exact.name;

        // 2. Base language match
        const base = category.translations.find((t: any) => t.language.toLowerCase() === baseLang);
        if (base) return base.name;

        // 3. English fallback
        const en = category.translations.find((t: any) => t.language === 'en');
        if (en) return en.name;

        // 4. First available
        return category.translations[0].name;
    }
}
