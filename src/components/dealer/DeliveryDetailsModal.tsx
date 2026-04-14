import { X, MapPin, Package, User, Calendar, MessageCircle } from 'lucide-react';
import { Delivery, Driver, DeliveryStatus } from '../../../shared/schema';
import { StatusBadge } from '../ui/Badge';
import { formatDate } from '../../lib/dateUtils';
import { DeliveryPhotoGallery } from '../delivery/DeliveryPhotoGallery';

interface DeliveryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery;
  driver?: Driver | null;
  onOpenChat: () => void;
}

export function DeliveryDetailsModal({
  isOpen,
  onClose,
  delivery,
  driver,
  onOpenChat,
}: DeliveryDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Delivery Details</h2>
          <button
            onClick={onClose}
            className="touch-target text-gray-400 hover:text-gray-600 transition-colors -mr-2"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <StatusBadge status={delivery.status as DeliveryStatus} />
              <span className="text-sm text-gray-500">
                {delivery.createdAt ? formatDate(new Date(delivery.createdAt).toISOString()) : ''}
              </span>
            </div>

            <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">VIN</p>
                <p className="text-lg font-mono text-gray-900">{delivery.vin}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Pickup Location</p>
                <p className="text-gray-900">{delivery.pickup}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <MapPin className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Dropoff Location</p>
                <p className="text-gray-900">{delivery.dropoff}</p>
              </div>
            </div>

            {driver && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Driver</p>
                  <p className="text-gray-900">{driver.name}</p>
                  <p className="text-sm text-gray-600">{driver.phone}</p>
                  <p className="text-sm text-gray-600">{driver.canDriveManual ? 'Can drive manual' : 'Automatic only'}</p>
                </div>
              </div>
            )}

            {delivery.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                <p className="text-gray-900">{delivery.notes}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              {delivery.startedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Started</p>
                  <p className="text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(new Date(delivery.startedAt).toISOString())}
                  </p>
                </div>
              )}
              {delivery.completedAt && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Completed</p>
                  <p className="text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(new Date(delivery.completedAt).toISOString())}
                  </p>
                </div>
              )}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Photos</h3>
              <DeliveryPhotoGallery
                deliveryId={delivery.id}
                currentUserRole="dealer"
              />
            </div>
            </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-4 sm:p-6 flex flex-col-reverse sm:flex-row gap-3 safe-bottom">
          <button
            onClick={onClose}
            className="touch-target px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={onOpenChat}
            className="touch-target flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Open Chat
          </button>
        </div>
      </div>
    </div>
  );
}
