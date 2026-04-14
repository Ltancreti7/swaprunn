import { MapPin, MessageCircle, Calendar, ChevronDown, ChevronUp, Car, ArrowLeftRight, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Delivery } from '../../../shared/schema';
import { StatusBadge } from '../ui/Badge';
import { StatusTimeline } from '../ui/StatusTimeline';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { UnreadBadge } from '../ui/UnreadBadge';

interface DeliveryCardProps {
  delivery: Delivery;
  driverName?: string;
  onChatClick: () => void;
  onCancelClick?: () => void;
}

const formatDate = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function DeliveryCard({ delivery, driverName, onChatClick, onCancelClick }: DeliveryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const unreadCount = useUnreadMessages(delivery.id, user?.id);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-bold text-gray-900">VIN: {delivery.vin}</h3>
              <StatusBadge status={delivery.status as "pending" | "accepted" | "assigned" | "in_progress" | "completed" | "cancelled" | "pending_driver_acceptance"} />
              {delivery.serviceType && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {delivery.serviceType === 'delivery' ? (
                    <>
                      <Truck size={12} />
                      Delivery
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight size={12} />
                      Swap
                    </>
                  )}
                </span>
              )}
            </div>
            {delivery.year && delivery.make && delivery.model && (
              <div className="flex items-center gap-2 mb-2">
                <Car size={16} className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">
                  {delivery.year} {delivery.make} {delivery.model}
                  {delivery.transmission && (
                    <span className="text-gray-500 font-normal ml-2">• {delivery.transmission}</span>
                  )}
                </p>
              </div>
            )}
            <div className="flex items-center text-sm text-gray-500">
              <Calendar size={14} className="mr-1" />
              <span>Requested {delivery.createdAt ? formatDate(new Date(delivery.createdAt).toISOString()) : ''}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-0.5">Pickup</p>
              <p className="text-sm text-gray-900 break-words">{delivery.pickup}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
            <MapPin size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-0.5">Dropoff</p>
              <p className="text-sm text-gray-900 break-words">{delivery.dropoff}</p>
            </div>
          </div>

          {delivery.scheduledDate && delivery.scheduledTime && (
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <Calendar size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-900 mb-1">Scheduled</p>
                <p className="text-sm text-gray-900">
                  {new Date(delivery.scheduledDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} at {delivery.scheduledTime}
                </p>
              </div>
            </div>
          )}

          {driverName && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {driverName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600">Driver</p>
                <p className="text-sm font-medium text-gray-900">{driverName}</p>
              </div>
            </div>
          )}

          {delivery.serviceType === 'delivery' && (delivery.hasTrade || delivery.requiresSecondDriver) && (
            <div className="flex flex-wrap gap-2">
              {delivery.hasTrade && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Trade Involved
                </span>
              )}
              {delivery.requiresSecondDriver && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  Second Driver Required
                </span>
              )}
            </div>
          )}
        </div>

        {delivery.notes && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-1">Notes</p>
            <p className="text-sm text-gray-600">{delivery.notes}</p>
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isExpanded ? 'Hide' : 'Show'} Status Timeline</span>
          </button>
        </div>

        {isExpanded && (
          <div className="mb-4 pt-4 border-t border-gray-100">
            <StatusTimeline
              currentStatus={delivery.status as "pending" | "accepted" | "assigned" | "in_progress" | "completed" | "cancelled"}
              acceptedAt={delivery.acceptedAt ? new Date(delivery.acceptedAt).toISOString() : undefined}
              startedAt={delivery.startedAt ? new Date(delivery.startedAt).toISOString() : undefined}
              completedAt={delivery.completedAt ? new Date(delivery.completedAt).toISOString() : undefined}
              cancelledAt={delivery.cancelledAt ? new Date(delivery.cancelledAt).toISOString() : undefined}
            />
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-gray-100">
          {delivery.status === 'pending' && onCancelClick && (
            <button
              onClick={onCancelClick}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle size={16} />
              <span>Cancel</span>
            </button>
          )}
          <button
            onClick={onChatClick}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 relative"
          >
            <MessageCircle size={16} />
            <span>Chat</span>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1">
                <UnreadBadge count={unreadCount} />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
