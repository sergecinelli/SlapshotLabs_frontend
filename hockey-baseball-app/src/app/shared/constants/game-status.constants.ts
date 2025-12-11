import { GameStatus } from '../interfaces/schedule.interface';

/**
 * Game status display labels
 */
export const GameStatusLabels = {
    [GameStatus.NotStarted]: 'Scheduled',
    [GameStatus.GameInProgress]: 'Live',
    [GameStatus.GameOver]: 'Completed',
} as const;

/**
 * Get display label for game status
 */
export function getGameStatusLabel(status: GameStatus): string {
    return GameStatusLabels[status] || 'Unknown';
}

/**
 * Check if status name includes overtime
 */
export function isOvertimeStatus(statusName?: string): boolean {
    if (!statusName) return false;
    return statusName.includes('OT') || statusName.includes('Overtime');
}