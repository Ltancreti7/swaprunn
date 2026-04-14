import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 120,
  });

  const showIndicator = pullDistance > 20 || isRefreshing;
  const progress = Math.min(pullDistance / 80, 1);
  const rotation = pullDistance * 3;

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-10 transition-opacity duration-200"
        style={{
          top: Math.max(pullDistance - 50, -50),
          opacity: showIndicator ? 1 : 0,
        }}
        data-testid="pull-indicator"
      >
        <div 
          className={`bg-background border rounded-full p-2 shadow-lg ${isRefreshing ? 'refresh-spin' : ''}`}
          style={{
            transform: isRefreshing ? undefined : `rotate(${rotation}deg) scale(${0.8 + progress * 0.2})`,
          }}
        >
          <RefreshCw 
            className={`w-5 h-5 ${pullDistance >= 80 || isRefreshing ? 'text-primary' : 'text-muted-foreground'}`}
          />
        </div>
      </div>
      
      <div
        className="h-full overflow-y-auto bounce-scroll"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : undefined,
        }}
        {...handlers}
        data-testid="pull-container"
      >
        {children}
      </div>
    </div>
  );
}
