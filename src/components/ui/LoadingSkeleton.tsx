interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'button';
}

export function LoadingSkeleton({ className = '', variant = 'text' }: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';

  const variants = {
    text: 'h-4 w-full',
    card: 'h-32 w-full',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24',
  };

  return <div className={`${baseClasses} ${variants[variant]} ${className}`} />;
}

export function DeliveryCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="w-3/4" />
          <LoadingSkeleton className="w-1/2" />
        </div>
        <LoadingSkeleton variant="button" className="w-20" />
      </div>
      <LoadingSkeleton className="w-full h-3" />
      <LoadingSkeleton className="w-24 h-8" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <DeliveryCardSkeleton key={i} />
      ))}
    </div>
  );
}
