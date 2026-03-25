import { GameStatus, GameType } from '../interfaces/schedule.interface';
import { TryoutStatus } from '../interfaces/tryout.interface';
import {
  TransactionStatus,
  BraintreeTransactionStatus,
  SubscriptionStatus,
} from '../interfaces/payment.interface';

export interface StatusColor {
  color: string;
  backgroundColor: string;
}

export interface StatusConfig extends StatusColor {
  label?: string;
  icon?: string;
  tooltip?: string;
}

export const STATUS_TOOLTIP_DELAY = 700;

export const STATUS_COLOR: Record<string, StatusConfig> = {
  // Tryout Statuses
  [TryoutStatus.TryingOut]: {
    color: 'var(--cyan)',
    backgroundColor: 'color-mix(in srgb, var(--cyan) 15%, var(--background))',
    icon: 'sports_hockey',
    tooltip: 'Player is currently trying out for the team',
  },
  [TryoutStatus.MadeTeam]: {
    color: 'var(--green)',
    backgroundColor: 'var(--green-soft)',
    icon: 'check_circle',
    tooltip: 'Player has been accepted to the team roster',
  },
  [TryoutStatus.Cut]: {
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-soft)',
    icon: 'cancel',
    tooltip: 'Player has been cut from the tryout',
  },

  // Game Statuses
  [GameStatus.NotStarted]: {
    color: 'var(--text-primary)',
    backgroundColor: 'var(--border)',
    label: 'Scheduled',
    tooltip: 'Game has not started yet',
  },
  [GameStatus.GameInProgress]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    label: 'Live',
    tooltip: 'Game is currently in progress',
  },
  [GameStatus.GameOver]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    label: 'Completed',
    tooltip: 'Game has been completed',
  },

  // Game Type Statuses
  [GameType.RegularSeason]: {
    color: 'var(--blue-dark)',
    backgroundColor: 'var(--blue-soft)',
    tooltip: 'Regular season game',
  },
  [GameType.Playoff]: {
    color: 'var(--pink)',
    backgroundColor: 'color-mix(in srgb, var(--pink) 15%, var(--background))',
    tooltip: 'Playoff game',
  },
  [GameType.Tournament]: {
    color: 'var(--violet)',
    backgroundColor: 'color-mix(in srgb, var(--violet) 15%, var(--background))',
    tooltip: 'Tournament game',
  },
  [GameType.Exhibition]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    tooltip: 'Exhibition game',
  },
  [GameType.SummerLeague]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    tooltip: 'Summer league game',
  },

  // Payment Transaction Statuses
  [TransactionStatus.Paid]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    label: 'Paid',
    icon: 'check_circle',
    tooltip: 'Payment completed successfully',
  },
  [TransactionStatus.Failed]: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-soft)',
    label: 'Failed',
    icon: 'error',
    tooltip: 'Payment failed',
  },
  [TransactionStatus.Pending]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    label: 'Pending',
    icon: 'schedule',
    tooltip: 'Payment is being processed',
  },
  [TransactionStatus.Refunded]: {
    color: 'var(--blue-dark)',
    backgroundColor: 'var(--blue-soft)',
    label: 'Refunded',
    icon: 'undo',
    tooltip: 'Payment has been refunded',
  },

  // Braintree Transaction Statuses
  [BraintreeTransactionStatus.SubmittedForSettlement]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    icon: 'check_circle',
    label: 'Submitted For Settlement',
    tooltip: 'Payment submitted for settlement',
  },
  [BraintreeTransactionStatus.Settled]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    icon: 'check_circle',
    label: 'Settled',
    tooltip: 'Payment settled',
  },
  [BraintreeTransactionStatus.Settling]: {
    color: 'var(--green-dark)',
    backgroundColor: 'var(--green-soft)',
    icon: 'check_circle',
    label: 'Settling',
    tooltip: 'Payment is settling',
  },
  [BraintreeTransactionStatus.Authorized]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    icon: 'schedule',
    label: 'Authorized',
    tooltip: 'Payment authorized',
  },
  [BraintreeTransactionStatus.Authorizing]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    icon: 'schedule',
    label: 'Authorizing',
    tooltip: 'Payment is authorizing',
  },
  [BraintreeTransactionStatus.SettlementPending]: {
    color: 'var(--orange)',
    backgroundColor: 'color-mix(in srgb, var(--orange) 15%, var(--background))',
    icon: 'schedule',
    label: 'Settlement Pending',
    tooltip: 'Settlement pending',
  },
  [BraintreeTransactionStatus.GatewayRejected]: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-soft)',
    icon: 'error',
    label: 'Gateway Rejected',
    tooltip: 'Payment rejected by gateway',
  },
  [BraintreeTransactionStatus.ProcessorDeclined]: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-soft)',
    icon: 'error',
    label: 'Processor Declined',
    tooltip: 'Payment declined by processor',
  },
  [BraintreeTransactionStatus.Failed]: {
    color: 'var(--danger)',
    backgroundColor: 'var(--danger-soft)',
    icon: 'error',
    label: 'Failed',
    tooltip: 'Payment failed',
  },
  [BraintreeTransactionStatus.Voided]: {
    color: 'var(--blue-dark)',
    backgroundColor: 'var(--blue-soft)',
    icon: 'undo',
    label: 'Voided',
    tooltip: 'Payment voided',
  },

  // Subscription Statuses
  [SubscriptionStatus.Active]: {
    color: 'var(--text-white)',
    backgroundColor: 'var(--green-dark)',
    label: 'Active',
    icon: 'check_circle',
    tooltip: 'Subscription is active',
  },
  [SubscriptionStatus.Canceled]: {
    color: 'var(--text-white)',
    backgroundColor: 'var(--danger)',
    label: 'Canceled',
    icon: 'cancel',
    tooltip: 'Subscription has been canceled',
  },
  [SubscriptionStatus.PastDue]: {
    color: 'var(--text-white)',
    backgroundColor: 'var(--orange)',
    label: 'Past Due',
    icon: 'warning',
    tooltip: 'Payment is past due',
  },
  [SubscriptionStatus.Expired]: {
    color: 'var(--text-white)',
    backgroundColor: 'var(--text-secondary)',
    label: 'Expired',
    icon: 'event_busy',
    tooltip: 'Subscription has expired',
  },
};

export function getStatusStyle(status: string | number): Record<string, string> {
  const config = STATUS_COLOR[status];
  if (!config) return {};
  return { color: config.color, 'background-color': config.backgroundColor };
}

export function getStatusIconStyle(status: string | number): Record<string, string> {
  const config = STATUS_COLOR[status];
  if (!config) return {};
  return {
    color: config.color,
    'background-color': `color-mix(in srgb, ${config.color} 8%, transparent)`,
  };
}

export function getStatusIcon(status: string | number): string {
  return STATUS_COLOR[status]?.icon ?? 'help';
}

export function getStatusTooltip(status: string | number): string {
  return STATUS_COLOR[status]?.tooltip ?? '';
}

export function getGameStatusLabel(status: GameStatus): string {
  return STATUS_COLOR[status]?.label || 'Unknown';
}

export function isOvertimeStatus(statusName?: string): boolean {
  if (!statusName) return false;
  return statusName.includes('OT') || statusName.includes('Overtime');
}
