import { useState, useEffect } from 'react';
import { Search, Building2, Phone, MapPin, CheckCircle, Clock, XCircle, Award } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ApplyToDealershipModal } from './ApplyToDealershipModal';
import api from '../../lib/api';
import type { Dealer, DriverApplication } from '../../../shared/schema';

interface DealershipSearchProps {
  driverId: string;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface DealerWithApproval extends Dealer {
  approvedAt?: Date | null;
}

export function DealershipSearch({ driverId, showToast }: DealershipSearchProps) {
  const [dealerships, setDealerships] = useState<Dealer[]>([]);
  const [myDealerships, setMyDealerships] = useState<DealerWithApproval[]>([]);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);

  useEffect(() => {
    loadData();
  }, [driverId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadMyDealerships(), loadDealerships(), loadApplications()]);
    setLoading(false);
  };

  const loadMyDealerships = async () => {
    try {
      const data = await api.drivers.myDealerships();
      if (data) {
        setMyDealerships(data);
      }
    } catch (err) {
      console.error('Error loading my dealerships:', err);
    }
  };

  const loadDealerships = async () => {
    try {
      const data = await api.dealers.list();
      if (data) setDealerships(data);
    } catch (err) {
      console.error('Error loading dealerships:', err);
      showToast('Failed to load dealerships', 'error');
    }
  };

  const loadApplications = async () => {
    try {
      const data = await api.driverApplications.list();
      if (data) setApplications(data);
    } catch (err) {
      console.error('Error loading applications:', err);
    }
  };

  const handleApply = async (dealerId: string, message: string) => {
    try {
      await api.driverApplications.create({ dealerId, message: message || '' });

      const dealer = dealerships.find(d => d.id === dealerId);
      showToast(`Application submitted to ${dealer?.name || 'dealership'}!`, 'success');
      await loadApplications();
    } catch (err: unknown) {
      console.error('Application error:', err);
      const message = err instanceof Error ? err.message : 'Failed to submit application';
      if (message.includes('already applied')) {
        showToast('You have already applied to this dealership', 'error');
      } else {
        showToast(message, 'error');
      }
      throw err;
    }
  };

  const getApplicationStatus = (dealerId: string): DriverApplication | null => {
    return applications.find(app => app.dealerId === dealerId) || null;
  };

  const filteredDealerships = dealerships.filter((dealer) => {
    const matchesSearch =
      dealer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dealer.phone?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {myDealerships.length > 0 && (
        <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <Award size={24} className="mr-2 text-green-500" />
            My Dealerships
          </h2>
          <p className="text-gray-400 mb-4">
            Dealerships you're currently approved to work with
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myDealerships.map((dealer) => (
              <Card key={dealer.id}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{dealer.name}</h3>
                    <div className="flex items-center gap-1 text-green-400">
                      <CheckCircle size={16} />
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dealer.phone && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Phone size={14} className="mr-2 flex-shrink-0 text-red-400" />
                        <span>{dealer.phone}</span>
                      </div>
                    )}
                    {dealer.address && (
                      <div className="flex items-start text-sm text-gray-400">
                        <MapPin size={14} className="mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                        <span>{dealer.address}</span>
                      </div>
                    )}
                    {dealer.approvedAt && (
                      <div className="text-xs text-gray-500 pt-2 border-t border-neutral-700">
                        Approved {new Date(dealer.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 px-4 py-2 bg-green-900/50 text-green-400 rounded-lg text-sm font-semibold text-center">
                    Active Partnership
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center text-white">
            <Building2 size={24} className="mr-2 text-red-500" />
            Browse Dealerships
          </h2>
          <p className="text-gray-400 mb-4">
            Search and apply to dealerships you'd like to work with. Once approved, you'll be able to accept their delivery requests.
          </p>
        </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          size={20}
        />
        <input
          type="text"
          placeholder="Search by dealership name, address, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-transparent"
          data-testid="input-search-dealerships"
        />
      </div>

      <div className="text-sm text-gray-400">
        Showing {filteredDealerships.length} of {dealerships.length} dealerships
      </div>

      {filteredDealerships.length === 0 ? (
        dealerships.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No dealerships available"
            description="There are currently no dealerships in the system"
          />
        ) : (
          <EmptyState
            icon={Search}
            title="No results found"
            description="Try adjusting your search criteria"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDealerships.map((dealer) => {
            const application = getApplicationStatus(dealer.id);
            return (
              <Card key={dealer.id} hover={!application} data-testid={`card-dealer-${dealer.id}`}>
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{dealer.name}</h3>
                    </div>
                    {application && (
                      <div className="ml-2">
                        {application.status === 'pending' && (
                          <div className="flex items-center gap-1 text-yellow-400">
                            <Clock size={16} />
                            <span className="text-xs font-medium">Pending</span>
                          </div>
                        )}
                        {application.status === 'approved' && (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle size={16} />
                            <span className="text-xs font-medium">Approved</span>
                          </div>
                        )}
                        {application.status === 'rejected' && (
                          <div className="flex items-center gap-1 text-red-400">
                            <XCircle size={16} />
                            <span className="text-xs font-medium">Not Approved</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    {dealer.phone && (
                      <div className="flex items-center text-sm text-gray-400">
                        <Phone size={14} className="mr-2 flex-shrink-0 text-red-400" />
                        <span>{dealer.phone}</span>
                      </div>
                    )}
                    {dealer.address && (
                      <div className="flex items-start text-sm text-gray-400">
                        <MapPin size={14} className="mr-2 mt-0.5 flex-shrink-0 text-red-400" />
                        <span>{dealer.address}</span>
                      </div>
                    )}
                  </div>

                  {!application ? (
                    <button
                      onClick={() => setSelectedDealer(dealer)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                      data-testid={`button-apply-${dealer.id}`}
                    >
                      Apply Now
                    </button>
                  ) : application.status === 'pending' ? (
                    <div className="w-full px-4 py-2 bg-neutral-700 text-gray-400 rounded-lg text-sm font-semibold text-center">
                      Application Pending Review
                    </div>
                  ) : application.status === 'approved' ? (
                    <div className="w-full px-4 py-2 bg-green-900/50 text-green-400 rounded-lg text-sm font-semibold text-center">
                      You're Approved!
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedDealer(dealer)}
                      className="w-full px-4 py-2 border border-red-600 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-900/30 transition"
                      data-testid={`button-reapply-${dealer.id}`}
                    >
                      Reapply
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

        {selectedDealer && (
          <ApplyToDealershipModal
            dealer={selectedDealer}
            onClose={() => setSelectedDealer(null)}
            onSubmit={handleApply}
          />
        )}
      </div>
    </div>
  );
}
