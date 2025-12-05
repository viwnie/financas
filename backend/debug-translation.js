const { pipeline, env } = require('@xenova/transformers');

// Enable more verbose logging if possible, or just log manually
console.log('Starting model load...');

// Optional: Set cache directory to a known location
// env.cacheDir = './.cache'; 

(async () => {
    try {
        // Add a progress callback if supported, or just wait
        console.log('Calling pipeline...');
        const translator = await pipeline('translation', 'Xenova/nllb-200-distilled-600M', {
            progress_callback: (data) => {
                console.log('Progress:', data);
            }
        });
        console.log('Model loaded successfully!');

        const result = await translator('Olá mundo', {
            src_lang: 'por_Latn',
            tgt_lang: 'eng_Latn',
        });
        console.log('Translation result:', result);
    } catch (error) {
        console.error('Error loading model:', error);
    }
})();
