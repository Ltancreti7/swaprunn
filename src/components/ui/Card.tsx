interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', onClick, hover = false, style }: CardProps) {
  const baseClasses = 'bg-neutral-800 border border-neutral-700 rounded-lg p-4 transition-all';
  const hoverClasses = hover
    ? 'hover:border-red-600 hover:shadow-md cursor-pointer'
    : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}

interface CardSubProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardSubProps) {
  return (
    <div className={`flex flex-col space-y-1.5 pb-3 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: CardSubProps) {
  return (
    <h3 className={`font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }: CardSubProps) {
  return (
    <div className={`${className}`}>
      {children}
    </div>
  );
}

export function CardDescription({ children, className = '' }: CardSubProps) {
  return (
    <p className={`text-sm text-gray-500 ${className}`}>
      {children}
    </p>
  );
}

export function CardFooter({ children, className = '' }: CardSubProps) {
  return (
    <div className={`flex items-center pt-3 ${className}`}>
      {children}
    </div>
  );
}
