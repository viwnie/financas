
export class TextHelper {
    static sanitizeUsername(username: string): string {
        return username.replace(/[^a-zA-Z0-9]/g, '');
    }

    static capitalize(text: string): string {
        if (!text) return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    static titleCase(text: string): string {
        if (!text) return text;
        return text
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
}
