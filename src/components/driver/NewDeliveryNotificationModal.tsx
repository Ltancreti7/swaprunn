import { useEffect, useState } from 'react';
import { Bell, Truck, MapPin, Building2, X } from 'lucide-react';
import { Delivery, Dealer } from '../../../shared/schema';
import { StatusBadge } from '../ui/Badge';

interface NewDeliveryNotificationModalProps {
  delivery: Delivery & { dealer: Dealer };
  onAccept: () => void;
  onDismiss: () => void;
}

export function NewDeliveryNotificationModal({
  delivery,
  onAccept,
  onDismiss,
}: NewDeliveryNotificationModalProps) {
  const [isPulsing, setIsPulsing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsPulsing(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-2xl max-w-2xl w-full border-4 border-yellow-400 ${
          isPulsing ? 'animate-pulse-scale' : ''
        }`}
      >
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-full animate-bounce">
                <Bell size={32} className="text-orange-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">
                  NEW DELIVERY REQUEST
                </h2>
                <p className="text-lg font-semibold text-gray-800 mt-1">
                  Action Required - Accept Now!
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-800 hover:text-gray-900 transition p-2 hover:bg-white/30 rounded-full"
              aria-label="Dismiss notification"
            >
              <X size={28} />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={24} className="text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Dealership</p>
                <p className="text-2xl font-bold text-gray-900">{delivery.dealer.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Truck size={24} className="text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Vehicle VIN</p>
                  <p className="text-xl font-bold text-gray-900 font-mono">{delivery.vin}</p>
                </div>
              </div>

              {delivery.year && delivery.make && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Vehicle Details</p>
                  <p className="text-lg font-bold text-gray-900">
                    {delivery.year} {delivery.make} {delivery.model || ''}
                  </p>
                  {delivery.transmission && (
                    <p className="text-sm text-gray-600 mt-1">{delivery.transmission}</p>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <MapPin size={24} className="text-green-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Pickup Location</p>
                  <p className="text-lg font-semibold text-gray-900">{delivery.pickup}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <MapPin size={24} className="text-red-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Dropoff Location</p>
                  <p className="text-lg font-semibold text-gray-900">{delivery.dropoff}</p>
                </div>
              </div>

              {delivery.serviceType && (
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Service Type</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={delivery.serviceType === 'delivery' ? 'pending' : 'in_progress'} />
                    <p className="text-lg font-bold text-gray-900 capitalize">{delivery.serviceType}</p>
                  </div>
                  {delivery.serviceType === 'delivery' && (
                    <div className="mt-2 space-y-1">
                      {delivery.hasTrade !== null && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Trade Involved:</span> {delivery.hasTrade ? 'Yes' : 'No'}
                        </p>
                      )}
                      {delivery.requiresSecondDriver !== null && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Second Driver Required:</span> {delivery.requiresSecondDriver ? 'Yes' : 'No'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {delivery.notes && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="text-sm font-bold text-yellow-900 mb-2">Special Instructions:</p>
                  <p className="text-base text-gray-800">{delivery.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5 px-8 rounded-xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <Truck size={28} />
              ACCEPT THIS DELIVERY
            </button>
            <button
              onClick={onDismiss}
              className="px-8 py-5 border-3 border-gray-400 bg-white text-gray-700 rounded-xl font-bold text-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
            >
              Not Now
            </button>
          </div>

          <p className="text-center text-sm text-gray-600">
            This delivery request is available to all approved drivers. Accept quickly to secure it!
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        .animate-pulse-scale {
          animation: pulse-scale 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
