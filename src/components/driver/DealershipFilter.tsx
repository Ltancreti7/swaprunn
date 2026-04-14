import { Building2, CheckCircle } from 'lucide-react';
import type { Dealer } from '../../../shared/schema';

interface DealershipFilterProps {
  dealerships: Dealer[];
  selectedDealershipId: string | null;
  onSelectDealership: (dealershipId: string | null) => void;
  dealershipColors: Map<string, string>;
  requestCounts: Map<string, number>;
}

export function DealershipFilter({
  dealerships,
  selectedDealershipId,
  onSelectDealership,
  dealershipColors,
  requestCounts,
}: DealershipFilterProps) {
  const totalRequests = Array.from(requestCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Building2 size={16} />
        Filter by Dealership
      </h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSelectDealership(null)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
            selectedDealershipId === null
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center gap-2">
            All Dealerships
            {totalRequests > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                selectedDealershipId === null
                  ? 'bg-white text-red-600'
                  : 'bg-red-100 text-red-600'
              }`}>
                {totalRequests}
              </span>
            )}
          </span>
        </button>
        {dealerships.map((dealership) => {
          const color = dealershipColors.get(dealership.id) || '#6B7280';
          const count = requestCounts.get(dealership.id) || 0;
          const isSelected = selectedDealershipId === dealership.id;

          return (
            <button
              key={dealership.id}
              onClick={() => onSelectDealership(dealership.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              style={{
                backgroundColor: isSelected ? color : undefined,
                color: isSelected ? 'white' : color,
              }}
            >
              {isSelected && <CheckCircle size={16} />}
              <span>{dealership.name}</span>
              {count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isSelected
                    ? 'bg-white'
                    : 'bg-gray-200'
                }`} style={{
                  color: isSelected ? color : undefined
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}