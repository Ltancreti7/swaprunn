import { Search } from 'lucide-react';

interface DeliveryFiltersProps {
  activeFilter: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'all';
  onFilterChange: (filter: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  counts: {
    pending: number;
    accepted: number;
    in_progress: number;
    completed: number;
  };
}

export function DeliveryFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  counts
}: DeliveryFiltersProps) {
  const filters: Array<{
    id: 'pending' | 'accepted' | 'in_progress' | 'completed';
    label: string;
  }> = [
    { id: 'pending', label: 'Pending' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'in_progress', label: 'Upcoming' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search by VIN, pickup, or dropoff..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count = counts[filter.id];

          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {filter.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  isActive ? 'bg-white bg-opacity-20' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              )}
              {count > 0 && filter.id !== 'completed' && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
