import { Check } from 'lucide-react';

interface TimelineStep {
  status: 'pending' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  label: string;
  timestamp?: string;
}

interface StatusTimelineProps {
  currentStatus: 'pending' | 'accepted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

const formatTime = (timestamp?: string) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function StatusTimeline({
  currentStatus,
  acceptedAt,
  startedAt,
  completedAt,
  cancelledAt
}: StatusTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 text-gray-700">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="font-medium">Cancelled</span>
          {cancelledAt && (
            <span className="text-sm text-gray-500 ml-auto">{formatTime(cancelledAt)}</span>
          )}
        </div>
      </div>
    );
  }

  const steps: TimelineStep[] = [
    { status: 'pending', label: 'Requested', timestamp: undefined },
    { status: 'accepted', label: 'Accepted', timestamp: acceptedAt },
    { status: 'in_progress', label: 'In Progress', timestamp: startedAt },
    { status: 'completed', label: 'Completed', timestamp: completedAt },
  ];

  const statusOrder = ['pending', 'accepted', 'in_progress', 'completed'];
  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between relative">
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.status} className="flex flex-col items-center flex-1 relative">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-300 ${
                      isCompleted ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  />
                )}

                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCompleted
                        ? isCurrent
                          ? 'bg-red-600 border-red-600 scale-110 shadow-lg shadow-red-200'
                          : 'bg-red-600 border-red-600'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {isCompleted && (
                      <Check
                        size={16}
                        className={`text-white ${isCurrent ? 'animate-pulse' : ''}`}
                      />
                    )}
                  </div>

                  <div className="absolute top-10 text-center whitespace-nowrap">
                    <p className={`text-xs font-medium ${
                      isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(step.timestamp)}
                      </p>
                    )}
                  </div>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-300 ${
                      index < currentIndex ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
