import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Clock, User, Car, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AddressInput } from '../ui/AddressInput';
import { formatAddress } from '../../lib/addressUtils';
import type { Driver } from '../../../shared/schema';

interface AddressFields {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ScheduleDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  dealerId: string;
  salesId: string;
  defaultPickupAddress?: AddressFields;
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface DriverWithStats extends Driver {
  completedDeliveries?: number;
  averageRating?: number;
}

export function ScheduleDeliveryModal({
  isOpen,
  onClose,
  selectedDate,
  dealerId,
  salesId,
  defaultPickupAddress,
  onSuccess,
  showToast,
}: ScheduleDeliveryModalProps) {
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  
  const [formData, setFormData] = useState({
    scheduledDate: selectedDate,
    scheduledTime: '09:00',
    driverId: '',
    customerName: '',
    year: '',
    make: '',
    model: '',
    vin: '',
    transmission: 'automatic',
    pickupAddress: defaultPickupAddress || { street: '', city: '', state: '', zip: '' },
    dropoffAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
    notes: '',
    serviceType: 'delivery' as 'delivery' | 'swap',
  });

  useEffect(() => {
    if (isOpen && dealerId) {
      loadDrivers();
      setFormData(prev => ({
        ...prev,
        scheduledDate: selectedDate,
        pickupAddress: defaultPickupAddress || prev.pickupAddress,
      }));
    }
  }, [isOpen, dealerId, selectedDate, defaultPickupAddress]);

  const loadDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const approvedDrivers = await api.drivers.approvedByDealer(dealerId);
      setDrivers(approvedDrivers || []);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    }
    setLoadingDrivers(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vin.trim()) {
      showToast('Please enter a VIN', 'error');
      return;
    }
    if (!formData.dropoffAddress.street) {
      showToast('Please enter a dropoff address', 'error');
      return;
    }
    if (!formData.pickupAddress.street) {
      showToast('Please enter a pickup address', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.deliveries.create({
        dealerId,
        salesId: salesId || null,
        driverId: formData.driverId || null,
        customerName: formData.customerName || null,
        pickup: formatAddress(formData.pickupAddress),
        dropoff: formatAddress(formData.dropoffAddress),
        pickupStreet: formData.pickupAddress.street,
        pickupCity: formData.pickupAddress.city,
        pickupState: formData.pickupAddress.state,
        pickupZip: formData.pickupAddress.zip,
        dropoffStreet: formData.dropoffAddress.street,
        dropoffCity: formData.dropoffAddress.city,
        dropoffState: formData.dropoffAddress.state,
        dropoffZip: formData.dropoffAddress.zip,
        vin: formData.vin,
        year: parseInt(formData.year) || null,
        make: formData.make || null,
        model: formData.model || null,
        transmission: formData.transmission || null,
        notes: formData.notes || null,
        serviceType: formData.serviceType,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        status: formData.driverId ? 'pending_driver_acceptance' : 'pending',
        requiredTimeframe: 'custom',
        customDate: formData.scheduledDate,
      });

      showToast('Delivery scheduled successfully!', 'success');
      onSuccess();
      onClose();
      
      setFormData({
        scheduledDate: selectedDate,
        scheduledTime: '09:00',
        driverId: '',
        year: '',
        make: '',
        model: '',
        vin: '',
        transmission: 'automatic',
        pickupAddress: defaultPickupAddress || { street: '', city: '', state: '', zip: '' },
        dropoffAddress: { street: '', city: '', state: '', zip: '' },
        notes: '',
        serviceType: 'delivery',
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule delivery', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Schedule Delivery</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-700 rounded-lg transition"
            data-testid="button-close-modal"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="text-red-400" />
                Date
              </label>
              <input
                type="date"
                required
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent"
                data-testid="input-date"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Clock size={16} className="text-red-400" />
                Time
              </label>
              <input
                type="time"
                required
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent"
                data-testid="input-time"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <User size={16} className="text-red-400" />
              Assign Driver (Optional)
            </label>
            {loadingDrivers ? (
              <div className="flex items-center gap-2 text-gray-400 py-3">
                <Loader2 size={16} className="animate-spin" />
                Loading drivers...
              </div>
            ) : (
              <select
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent"
                data-testid="select-driver"
              >
                <option value="">Unassigned - Post to job board</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} {driver.completedDeliveries ? `(${driver.completedDeliveries} deliveries)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <User size={16} className="text-red-400" />
              Customer Name
            </label>
            <input
              type="text"
              placeholder="Enter customer name"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent"
              data-testid="input-customer-name"
            />
          </div>

          <div className="border-t border-neutral-700 pt-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <Car size={18} className="text-red-400" />
              Vehicle Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                <input
                  type="text"
                  placeholder="2024"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Make</label>
                <input
                  type="text"
                  placeholder="Toyota"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-make"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Model</label>
                <input
                  type="text"
                  placeholder="Camry"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="input-model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Transmission</label>
                <select
                  value={formData.transmission}
                  onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                  className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  data-testid="select-transmission"
                >
                  <option value="automatic">Automatic</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">VIN *</label>
              <input
                type="text"
                required
                placeholder="Enter VIN number"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent"
                data-testid="input-vin"
              />
            </div>
          </div>

          <div className="border-t border-neutral-700 pt-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
              <MapPin size={18} className="text-red-400" />
              Locations
            </h3>
            
            <div className="space-y-4">
              <AddressInput
                label="Pickup Location"
                value={formData.pickupAddress}
                onChange={(address) => setFormData({ ...formData, pickupAddress: address })}
                required
              />
              
              <AddressInput
                label="Dropoff Location (WHERE)"
                value={formData.dropoffAddress}
                onChange={(address) => setFormData({ ...formData, dropoffAddress: address })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Service Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="delivery"
                  checked={formData.serviceType === 'delivery'}
                  onChange={() => setFormData({ ...formData, serviceType: 'delivery' })}
                  className="text-red-600 focus:ring-red-600"
                />
                <span className="text-gray-300">Delivery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="serviceType"
                  value="swap"
                  checked={formData.serviceType === 'swap'}
                  onChange={() => setFormData({ ...formData, serviceType: 'swap' })}
                  className="text-red-600 focus:ring-red-600"
                />
                <span className="text-gray-300">Dealer Swap</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
            <textarea
              placeholder="Any special instructions..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
              data-testid="input-notes"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition border border-neutral-600"
              data-testid="button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="button-schedule"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Delivery'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
