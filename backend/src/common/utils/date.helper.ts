
export class DateHelper {
    static getMonthRange(year: number, month: number): { startDate: Date; endDate: Date } {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }

    static getYearRange(year: number): { startDate: Date; endDate: Date } {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }
}
