import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class TranslationService implements OnModuleInit {
    private readonly logger = new Logger(TranslationService.name);
    private readonly apiUrl = process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5000';

    onModuleInit() {
        this.logger.log(`Translation service initialized (Using Offline LibreTranslate at ${this.apiUrl}).`);
    }

    async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
        try {
            // Map 'pt' to 'pt-BR' as requested by user for better accuracy
            // and ensure source is correct
            const cleanSource = sourceLang === 'pt' ? 'pt' : sourceLang.split('-')[0].toLowerCase();
            const cleanTarget = targetLang === 'pt' ? 'pt-BR' : targetLang.split('-')[0].toLowerCase();

            this.logger.debug(`Translating: "${text}" (${cleanSource}->${cleanTarget})`);

            const response = await fetch(`${this.apiUrl}/translate`, {
                method: 'POST',
                body: JSON.stringify({
                    q: text,
                    source: cleanSource,
                    target: cleanTarget,
                    format: 'text'
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`LibreTranslate API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const res = await response.json();

            // LibreTranslate returns { translatedText: "..." }
            const translatedText = res.translatedText;

            this.logger.debug(`Translation result: "${translatedText}"`);
            return translatedText;
        } catch (error) {
            this.logger.error(`Translation failed for "${text}". Ensure LibreTranslate is running at ${this.apiUrl}`, error.message);
            return text; // Fallback to original text
        }
    }
}
