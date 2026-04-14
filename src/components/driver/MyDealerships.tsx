import { Building2, Phone, Mail, MapPin, Calendar, Inbox, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import type { Dealer, ApprovedDriverDealer } from '../../../shared/schema';

interface DealershipWithStats extends ApprovedDriverDealer {
  dealer: Dealer;
  pendingCount?: number;
  upcomingCount?: number;
  completedCount?: number;
}

interface MyDealershipsProps {
  approvedDealerships: DealershipWithStats[];
  dealershipColors: Map<string, string>;
  onSelectDealership: (dealershipId: string) => void;
  onNavigateToTab: (tab: 'requests' | 'upcoming' | 'recent' | 'search' | 'dealerships') => void;
}

export function MyDealerships({
  approvedDealerships,
  dealershipColors,
  onSelectDealership,
  onNavigateToTab,
}: MyDealershipsProps) {
  const getDealershipColor = (dealershipId: string) => {
    return dealershipColors.get(dealershipId) || '#6B7280';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewRequests = (dealershipId: string) => {
    onSelectDealership(dealershipId);
    onNavigateToTab('requests');
  };

  if (approvedDealerships.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No approved dealerships"
        description="Once a dealership approves your application, they will appear here. Go to 'Find Dealerships' to apply to dealerships in your area."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Building2 size={28} className="mr-3 text-red-600" />
          My Dealerships
        </h2>
        <div className="text-sm text-gray-600">
          <span className="font-semibold">{approvedDealerships.length}</span>{' '}
          {approvedDealerships.length === 1 ? 'Dealership' : 'Dealerships'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {approvedDealerships.map((relationship) => {
          const dealer = relationship.dealer;
          const color = getDealershipColor(dealer.id);

          return (
            <Card key={relationship.id} hover>
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <h3 className="text-xl font-bold">{dealer.name}</h3>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin size={14} className="mr-2 text-gray-400" />
                      {dealer.address}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone size={14} className="mr-2 text-gray-400" />
                    {dealer.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail size={14} className="mr-2 text-gray-400" />
                    {dealer.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar size={14} className="mr-2 text-gray-400" />
                    Approved {relationship.approvedAt && formatDate(relationship.approvedAt.toString())}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Inbox size={16} className="text-red-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {relationship.pendingCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {relationship.upcomingCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">Upcoming</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <CheckCircle2 size={16} className="text-green-600" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {relationship.completedCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                </div>

                <button
                  onClick={() => handleViewRequests(dealer.id)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                >
                  View Requests
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
