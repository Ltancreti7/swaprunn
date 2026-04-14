import { useState, useEffect, useMemo } from 'react';
import { X, Star, TrendingUp, Clock, CheckCircle, Search, Award } from 'lucide-react';
import { Card } from '../ui/Card';
import api from '../../lib/api';
import type { Driver, DriverStatistics, DriverPreference } from '../../../shared/schema';

interface DriverWithDetails extends Driver {
  statistics?: DriverStatistics;
  preference?: DriverPreference;
}

interface DriverSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDriver: (driverId: string) => void;
  dealerId: string;
  currentUserId: string;
  selectedDriverId?: string;
}

export function DriverSelectionModal({
  isOpen,
  onClose,
  onSelectDriver,
  dealerId,
  currentUserId,
  selectedDriverId,
}: DriverSelectionModalProps) {
  const [drivers, setDrivers] = useState<DriverWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'preference' | 'performance' | 'recent' | 'name'>('preference');

  useEffect(() => {
    if (isOpen) {
      loadDrivers();
    }
  }, [isOpen, dealerId, currentUserId]);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const approvedDrivers = await api.drivers.approvedByDealer(dealerId);

      if (!approvedDrivers || approvedDrivers.length === 0) {
        setDrivers([]);
        setLoading(false);
        return;
      }

      const driversData = approvedDrivers.filter((driver: Driver) => driver.status === 'active');

      const statisticsData = await api.drivers.statistics(dealerId);
      const preferencesData = await api.drivers.preferences(dealerId);

      const driversWithDetails: DriverWithDetails[] = driversData.map((driver: Driver) => ({
        ...driver,
        statistics: statisticsData?.find((s: DriverStatistics) => s.driverId === driver.id),
        preference: preferencesData?.find((p: DriverPreference) => p.driverId === driver.id),
      }));

      setDrivers(driversWithDetails);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedDrivers = useMemo(() => {
    let filtered = drivers;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.email.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'preference':
          const prefA = a.preference?.preferenceLevel || 0;
          const prefB = b.preference?.preferenceLevel || 0;
          if (prefA !== prefB) return prefB - prefA;
          const useA = a.preference?.useCount || 0;
          const useB = b.preference?.useCount || 0;
          return useB - useA;

        case 'performance':
          const completedA = a.statistics?.completedDeliveries || 0;
          const completedB = b.statistics?.completedDeliveries || 0;
          if (completedA !== completedB) return completedB - completedA;
          const onTimeA = Number(a.statistics?.onTimePercentage) || 0;
          const onTimeB = Number(b.statistics?.onTimePercentage) || 0;
          return onTimeB - onTimeA;

        case 'recent':
          const lastUsedA = a.preference?.lastUsedAt || new Date('1970-01-01');
          const lastUsedB = b.preference?.lastUsedAt || new Date('1970-01-01');
          return new Date(lastUsedB).getTime() - new Date(lastUsedA).getTime();

        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return sorted;
  }, [drivers, searchQuery, sortBy]);

  const handleSelectDriver = (driverId: string) => {
    onSelectDriver(driverId);
    onClose();
  };

  const renderPreferenceStars = (level?: number | null) => {
    const stars = level || 0;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            className={i <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Driver</h2>
            <p className="text-sm text-gray-600 mt-1">Choose from your approved drivers</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            data-testid="button-close-modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search drivers by name, vehicle type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                data-testid="input-search-drivers"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'preference' | 'performance' | 'recent' | 'name')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
              data-testid="select-sort-by"
            >
              <option value="preference">Sort by Preference</option>
              <option value="performance">Sort by Performance</option>
              <option value="recent">Sort by Recent</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedDrivers.length === 0 ? (
            <div className="text-center py-12">
              <Award size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg font-medium">No drivers available</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery ? 'Try adjusting your search' : 'Add drivers to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedDrivers.map((driver) => (
                <Card
                  key={driver.id}
                  hover
                  className={`cursor-pointer transition ${
                    selectedDriverId === driver.id ? 'ring-2 ring-red-600 bg-red-50' : ''
                  }`}
                  onClick={() => handleSelectDriver(driver.id)}
                  data-testid={`card-driver-${driver.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                        {driver.preference && (driver.preference.preferenceLevel ?? 0) >= 4 && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold">Favorite</span>
                        )}
                        {driver.isAvailable ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-xs font-semibold">Available</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-full text-xs font-semibold">Unavailable</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">Transmission:</span>
                          <span className="px-2 py-1 bg-gray-100 text-xs rounded-full font-medium">
                            {driver.canDriveManual ? 'Manual OK' : 'Auto only'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700">Radius:</span>
                          <span className="px-2 py-1 bg-gray-100 text-xs rounded-full font-medium">
                            {driver.radius} mi
                          </span>
                        </div>
                      </div>

                      {driver.preference && (
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {renderPreferenceStars(driver.preference.preferenceLevel)}
                          </div>
                          <span className="text-xs text-gray-600">
                            Used {driver.preference.useCount} {driver.preference.useCount === 1 ? 'time' : 'times'}
                          </span>
                        </div>
                      )}

                      {driver.statistics && (
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle size={16} />
                            <span className="font-semibold">{driver.statistics.completedDeliveries}</span>
                            <span className="text-gray-600">completed</span>
                          </div>
                          {(driver.statistics.completedDeliveries ?? 0) > 0 && (
                            <div className="flex items-center gap-2 text-blue-700">
                              <TrendingUp size={16} />
                              <span className="font-semibold">{Number(driver.statistics.onTimePercentage).toFixed(0)}%</span>
                              <span className="text-gray-600">on-time</span>
                            </div>
                          )}
                          {driver.statistics.lastDeliveryAt && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock size={16} />
                              <span className="text-xs">
                                Last delivery: {new Date(driver.statistics.lastDeliveryAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedDriverId === driver.id && (
                      <div className="ml-4">
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                          <CheckCircle size={20} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            data-testid="button-cancel"
          >
            Cancel
          </button>
          <button
            onClick={() => handleSelectDriver('')}
            className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
            data-testid="button-leave-unassigned"
          >
            Leave Unassigned
          </button>
        </div>
      </div>
    </div>
  );
}
