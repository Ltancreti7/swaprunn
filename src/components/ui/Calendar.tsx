import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Delivery } from '../../../shared/schema';

interface CalendarProps {
  deliveries: Delivery[];
  onDeliveryClick: (deliveryId: string) => void;
}

export function Calendar({ deliveries, onDeliveryClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getDeliveriesForDate = (date: Date | null) => {
    if (!date) return [];

    const dateStr = date.toISOString().split('T')[0];
    return deliveries.filter(d => d.scheduledDate === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon size={24} className="text-red-600 md:w-7 md:h-7" />
            <span className="hidden sm:inline">Delivery Calendar</span>
            <span className="sm:hidden">Calendar</span>
          </h2>
          <button
            onClick={goToToday}
            className="px-3 md:px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Today
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-white rounded-md transition"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="px-4 py-2 font-semibold text-gray-900 text-center flex-1">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white rounded-md transition"
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs md:text-sm font-semibold text-gray-600 py-2">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((date, index) => {
          const dayDeliveries = getDeliveriesForDate(date);
          const hasDeliveries = dayDeliveries.length > 0;

          return (
            <div
              key={index}
              className={`min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 md:p-2 rounded-lg border-2 transition-all ${
                !date
                  ? 'bg-gray-50 border-gray-100'
                  : isToday(date)
                  ? 'bg-blue-50 border-blue-400'
                  : hasDeliveries
                  ? 'bg-red-50 border-red-200 hover:border-red-400 cursor-pointer'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {date && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-semibold ${
                        isToday(date)
                          ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {hasDeliveries && (
                      <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {dayDeliveries.length}
                      </span>
                    )}
                  </div>
                  {hasDeliveries && (
                    <div className="space-y-1">
                      {dayDeliveries.slice(0, 2).map(delivery => (
                        <div
                          key={delivery.id}
                          onClick={() => onDeliveryClick(delivery.id)}
                          className="bg-white rounded px-2 py-1 text-xs font-medium text-gray-900 hover:bg-red-100 transition cursor-pointer border border-gray-200"
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[10px] font-bold text-red-600">
                              {delivery.scheduledTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate text-[10px]">
                              {delivery.dropoffCity || delivery.dropoff}
                            </span>
                          </div>
                        </div>
                      ))}
                      {dayDeliveries.length > 2 && (
                        <div className="text-[10px] text-gray-500 font-medium text-center">
                          +{dayDeliveries.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {deliveries.filter(d => d.scheduledDate && d.scheduledTime).length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CalendarIcon size={64} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No scheduled deliveries</p>
          <p className="text-sm mt-2">Confirmed delivery schedules will appear here</p>
        </div>
      )}
    </div>
  );
}
