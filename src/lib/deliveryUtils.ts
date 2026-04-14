import { DeliveryTimeframe } from '../../shared/schema';

export function getTimeframeDisplay(timeframe?: DeliveryTimeframe, customDate?: string): string {
  if (!timeframe) return '';

  switch (timeframe) {
    case 'tomorrow':
      return 'Tomorrow';
    case 'next_few_days':
      return 'Next Few Days';
    case 'next_week':
      return 'Next Week';
    case 'custom':
      if (customDate) {
        const date = new Date(customDate);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return 'Custom Date';
    default:
      return '';
  }
}

export function getTimeframeColor(timeframe?: DeliveryTimeframe): string {
  if (!timeframe) return 'bg-gray-100 text-gray-700';

  switch (timeframe) {
    case 'tomorrow':
      return 'bg-red-100 text-red-700';
    case 'next_few_days':
      return 'bg-orange-100 text-orange-700';
    case 'next_week':
      return 'bg-blue-100 text-blue-700';
    case 'custom':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getTimeframeUrgency(timeframe?: DeliveryTimeframe): number {
  if (!timeframe) return 999;

  switch (timeframe) {
    case 'tomorrow':
      return 1;
    case 'next_few_days':
      return 2;
    case 'next_week':
      return 3;
    case 'custom':
      return 4;
    default:
      return 999;
  }
}
