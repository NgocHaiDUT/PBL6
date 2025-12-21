export class AdminDashboardQueryDto {
    period?: 'today' | 'week' | 'month' | 'year' | 'custom' = 'month';
    startDate?: string;
    endDate?: string;
}
