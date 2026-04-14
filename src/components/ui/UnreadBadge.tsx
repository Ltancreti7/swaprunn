interface UnreadBadgeProps {
  count: number;
  variant?: 'default' | 'button';
  className?: string;
}

export function UnreadBadge({ count, variant = 'default', className = '' }: UnreadBadgeProps) {
  if (count === 0) return null;

  if (variant === 'button') {
    return (
      <span className={`absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm ${className}`}>
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-600 text-white text-xs font-bold rounded-full ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
