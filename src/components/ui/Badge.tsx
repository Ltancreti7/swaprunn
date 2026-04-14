import {
  Clock,
  UserCheck,
  Truck,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Star,
  Navigation,
  MapPin,
  Package,
  LucideIcon
} from 'lucide-react';

interface BadgeProps {
  status: 'pending' | 'pending_driver_acceptance' | 'accepted' | 'assigned' | 'driver_en_route_pickup' | 'arrived_at_pickup' | 'in_transit' | 'arrived_at_dropoff' | 'in_progress' | 'completed' | 'cancelled';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-neutral-700 text-gray-300 border-neutral-600',
    icon: Clock,
  },
  pending_driver_acceptance: {
    label: 'Awaiting Response',
    color: 'bg-neutral-700 text-gray-300 border-neutral-600',
    icon: Star,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: ThumbsUp,
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: UserCheck,
  },
  driver_en_route_pickup: {
    label: 'En Route to Pickup',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: Navigation,
  },
  arrived_at_pickup: {
    label: 'At Pickup',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: MapPin,
  },
  in_transit: {
    label: 'In Transit',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: Truck,
  },
  arrived_at_dropoff: {
    label: 'At Dropoff',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: Package,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-neutral-600 text-gray-200 border-neutral-500',
    icon: Truck,
  },
  completed: {
    label: 'Completed',
    color: 'bg-neutral-800 text-gray-400 border-neutral-700',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-neutral-800 text-gray-500 border-neutral-700',
    icon: XCircle,
  },
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: BadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${config.color} ${sizeClasses[size]} transition-all`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: GenericBadgeProps) {
  const variantClasses = {
    default: 'bg-neutral-700 text-gray-300',
    secondary: 'bg-neutral-800 text-gray-400 border-neutral-700',
    destructive: 'bg-neutral-700 text-gray-300 border-neutral-600',
    outline: 'border border-neutral-600 text-gray-400 bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
