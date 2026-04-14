import { User, Package, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sales, Delivery } from '../../../shared/schema';
import { UnreadBadge } from '../ui/UnreadBadge';
import { useUnreadMessagesCount } from '../../hooks/useUnreadMessagesCount';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileHeaderProps {
  sales: Sales;
  deliveries: Delivery[];
  onFilterChange?: (filter: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'all') => void;
}

export function ProfileHeader({ sales, deliveries, onFilterChange }: ProfileHeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useUnreadMessagesCount(user?.id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalDeliveries = deliveries.length;
  const activeDeliveries = deliveries.filter(
    d => d.status === 'pending' || d.status === 'accepted' || d.status === 'in_progress'
  ).length;
  const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;

  const stats = [
    {
      label: 'Total Requests',
      value: totalDeliveries,
      icon: Package,
      color: 'bg-gray-700',
      textColor: 'text-gray-900',
      bgLight: 'bg-gray-50',
      filter: 'all' as const
    },
    {
      label: 'Active',
      value: activeDeliveries,
      icon: Clock,
      color: 'bg-gray-700',
      textColor: 'text-gray-900',
      bgLight: 'bg-gray-50',
      filter: 'in_progress' as const
    },
    {
      label: 'Completed',
      value: completedDeliveries,
      icon: CheckCircle,
      color: 'bg-gray-700',
      textColor: 'text-gray-900',
      bgLight: 'bg-gray-50',
      filter: 'completed' as const
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 pt-6 pb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {getInitials(sales.name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-3 border-white" />
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{sales.name}</h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <User size={16} />
                    <span>Sales Representative</span>
                  </div>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{sales.email}</span>
                  {sales.phone && (
                    <>
                      <span className="text-gray-300 hidden sm:inline">•</span>
                      <span className="hidden sm:inline">{sales.phone}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate('/conversations')}
                className="touch-target relative flex-shrink-0 p-2 sm:p-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm hover:shadow-md"
                title="All Conversations"
              >
                <MessageCircle size={20} />
                <UnreadBadge count={unreadCount} variant="button" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => onFilterChange?.(stat.filter)}
                className={`${stat.bgLight} rounded-xl p-3 sm:p-4 border border-gray-200 hover:shadow-md transition-all duration-200 md:hover:scale-105 hover:border-red-300 active:scale-95 cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center shadow-sm`}>
                    <Icon size={20} className="text-white" />
                  </div>
                </div>
                <div className={`text-xl sm:text-2xl font-bold ${stat.textColor} mb-1`}>
                  {stat.value}
                </div>
                <div className="text-xs font-medium text-gray-600">
                  {stat.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
