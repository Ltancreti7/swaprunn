import { MapPin, Building2, Clock, Calendar, User, Star, DollarSign } from 'lucide-react';
import { StatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { getTimeframeDisplay, getTimeframeColor } from '../../lib/deliveryUtils';
import type { Delivery, Dealer, DeliveryTimeframe } from '../../../shared/schema';

type DeliveryStatus = 'pending' | 'pending_driver_acceptance' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

interface DealershipRequestCardProps {
  delivery: Delivery & { dealer: Dealer; sales?: { name: string } | null };
  onAccept: (deliveryId: string) => void;
  onDecline?: (deliveryId: string) => void;
  dealerColor: string;
}

export function DealershipRequestCard({ delivery, onAccept, onDecline, dealerColor }: DealershipRequestCardProps) {
  const isSpecificallyRequested = false;
  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const destination = delivery.dropoffCity && delivery.dropoffState
    ? `${delivery.dropoffCity}, ${delivery.dropoffState}`
    : delivery.dropoff;

  return (
    <Card hover className={`border-l-4 ${isSpecificallyRequested ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`} style={{ borderLeftColor: dealerColor }}>
      {isSpecificallyRequested && (
        <div className="mb-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-yellow-600 fill-yellow-600" />
            <p className="text-sm font-bold text-yellow-900">
              You've been specifically requested for this delivery!
            </p>
          </div>
          {delivery.sales && (
            <p className="text-xs text-yellow-800 mt-1 ml-6">
              {delivery.sales.name} is waiting for your response
            </p>
          )}
        </div>
      )}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: dealerColor }} />
            <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{
              backgroundColor: `${dealerColor}15`,
              color: dealerColor
            }}>
              {delivery.dealer.name}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={14} />
              {delivery.createdAt && getTimeAgo(delivery.createdAt.toString())}
            </div>
          </div>
          <StatusBadge status={(delivery.status || 'pending') as DeliveryStatus} size="sm" />
        </div>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">Destination</p>
          <div className="flex items-center gap-2">
            <MapPin size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-xl font-bold text-gray-900">{destination}</p>
          </div>
        </div>

        {delivery.sales && (
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-gray-400" />
            <p className="text-sm text-gray-600">
              <span className="font-medium">Sales:</span> {delivery.sales.name}
            </p>
          </div>
        )}

        {delivery.requiredTimeframe && (
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={14} className="text-gray-400" />
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${getTimeframeColor(delivery.requiredTimeframe as DeliveryTimeframe)}`}>
              {getTimeframeDisplay(delivery.requiredTimeframe as DeliveryTimeframe, delivery.customDate || undefined)}
            </span>
          </div>
        )}
      </div>

      <div className="mb-4 pb-4 border-b border-gray-200">
        <p className="font-bold text-sm mb-2 text-gray-700">VIN: {delivery.vin}</p>
        {delivery.year && delivery.make && delivery.model && (
          <p className="text-xs text-gray-600 mb-2">
            {delivery.year} {delivery.make} {delivery.model}
            {delivery.transmission && ` • ${delivery.transmission}`}
          </p>
        )}
        <div className="flex items-start text-xs text-gray-600 mb-1">
          <MapPin size={12} className="mr-1 mt-0.5 text-gray-400 flex-shrink-0" />
          <div>
            <span className="font-medium">Pickup:</span>
            <span className="ml-1">{delivery.pickup}</span>
          </div>
        </div>
        <div className="flex items-start text-xs text-gray-600">
          <MapPin size={12} className="mr-1 mt-0.5 text-gray-400 flex-shrink-0" />
          <div>
            <span className="font-medium">Dropoff:</span>
            <span className="ml-1">{delivery.dropoff}</span>
          </div>
        </div>
      </div>
      {delivery.notes && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-1">Notes:</p>
          <p className="text-sm text-gray-700">{delivery.notes}</p>
        </div>
      )}

      {delivery.estimatedPayCents && (
        <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">Estimated Earnings</span>
            </div>
            <span className="text-2xl font-bold text-green-700">
              ${(delivery.estimatedPayCents / 100).toFixed(2)}
            </span>
          </div>
          {delivery.estimatedDurationMinutes && (
            <p className="text-xs text-green-600 mt-1 ml-7">
              ~{Math.round(delivery.estimatedDurationMinutes / 60 * 10) / 10} hours round trip
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => onAccept(delivery.id)}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition shadow-sm hover:shadow-md text-white"
          style={{
            backgroundColor: dealerColor,
            opacity: 0.95
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.95'}
        >
          Accept Request
        </button>
        {onDecline && (
          <button
            onClick={() => onDecline(delivery.id)}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition shadow-sm hover:shadow-md"
          >
            Decline
          </button>
        )}
      </div>
    </Card>
  );
}