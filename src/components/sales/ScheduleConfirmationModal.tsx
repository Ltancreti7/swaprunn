import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';

interface ScheduledDelivery {
  id: string;
  scheduledTime: string | null;
  status: string;
  dropoff: string;
}

interface ScheduleConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => Promise<void>;
  deliveryVin: string;
  driverName: string;
  driverId?: string;
  requiredTimeframe?: string;
  customDate?: string;
}

export function ScheduleConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  deliveryVin,
  driverName,
  driverId,
  requiredTimeframe,
  customDate,
}: ScheduleConfirmationModalProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [driverAvailability, setDriverAvailability] = useState<{
    isAvailable: boolean;
    scheduledDeliveries: ScheduledDelivery[];
  } | null>(null);

  useEffect(() => {
    if (!selectedDate || !driverId) {
      setDriverAvailability(null);
      return;
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      try {
        const result = await api.drivers.checkAvailability(driverId, selectedDate);
        setDriverAvailability({
          isAvailable: result.isAvailable,
          scheduledDeliveries: result.scheduledDeliveries
        });
      } catch (err) {
        console.error('Failed to check driver availability:', err);
        setDriverAvailability(null);
      }
      setCheckingAvailability(false);
    };

    checkAvailability();
  }, [selectedDate, driverId]);

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getSuggestedDate = () => {
    const today = new Date();
    if (requiredTimeframe === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    } else if (requiredTimeframe === 'next_few_days') {
      const threeDaysOut = new Date(today);
      threeDaysOut.setDate(threeDaysOut.getDate() + 3);
      return threeDaysOut.toISOString().split('T')[0];
    } else if (requiredTimeframe === 'next_week') {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    } else if (requiredTimeframe === 'custom' && customDate) {
      return customDate;
    }
    return new Date(today.setDate(today.getDate() + 1)).toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConfirm(selectedDate, selectedTime);
      setSelectedDate('');
      setSelectedTime('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Delivery Schedule">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                {driverName} has accepted this delivery
              </p>
              <p className="text-xs text-blue-800">
                VIN: {deliveryVin} • Set the final delivery schedule
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={16} />
            Scheduled Delivery Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            placeholder={getSuggestedDate()}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          {requiredTimeframe && (
            <p className="text-xs text-gray-500 mt-1">
              Suggested based on timeframe: {getSuggestedDate()}
            </p>
          )}
          
          {selectedDate && driverId && (
            <div className="mt-3">
              {checkingAvailability ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 size={14} className="animate-spin" />
                  Checking driver availability...
                </div>
              ) : driverAvailability ? (
                driverAvailability.isAvailable ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                    <CheckCircle size={16} className="flex-shrink-0" />
                    <span>{driverName} is available on this date</span>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2 text-sm text-yellow-800">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">{driverName} has {driverAvailability.scheduledDeliveries.length} other delivery(s) on this date</p>
                        <ul className="text-xs space-y-1">
                          {driverAvailability.scheduledDeliveries.map((d) => (
                            <li key={d.id}>
                              {d.scheduledTime ? `${formatTime(d.scheduledTime)} - ` : ''}
                              {d.dropoff?.substring(0, 40)}...
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs mt-2">You can still schedule, but coordinate timing carefully</p>
                      </div>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Clock size={16} />
            Scheduled Delivery Time
          </label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select the time for pickup/delivery
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">What happens next:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• The driver will be notified of the confirmed schedule</li>
            <li>• The delivery will appear on the calendar</li>
            <li>• You can continue coordinating through chat if needed</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Confirming...' : 'Confirm Schedule'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
