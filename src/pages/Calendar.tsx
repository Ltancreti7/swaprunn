import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Truck, User, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ScheduleDeliveryModal } from '../components/calendar/ScheduleDeliveryModal';
import type { Delivery, Dealer, Driver, Sales } from '../../shared/schema';

interface DeliveryWithRelations extends Delivery {
  dealer?: Dealer | null;
  driver?: Driver | null;
  sales?: Sales | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Calendar() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [deliveries, setDeliveries] = useState<DeliveryWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [salesData, setSalesData] = useState<Sales | null>(null);
  const [dealerId, setDealerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadScheduledDeliveries();
      loadUserData();
    }
  }, [user, currentDate]);

  const loadUserData = async () => {
    try {
      if (role === 'sales') {
        const sales = await api.sales.current();
        if (sales) {
          setSalesData(sales);
          setDealerId(sales.dealerId || null);
        }
      } else if (role === 'dealer') {
        const result = await api.dealers.current();
        if (result?.dealer) {
          setDealerId(result.dealer.id);
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  const loadScheduledDeliveries = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await api.deliveries.scheduled(year, month);
      setDeliveries(data || []);
    } catch (err) {
      console.error('Error loading scheduled deliveries:', err);
    }
    setLoading(false);
  };

  const deliveriesByDate = useMemo(() => {
    const map: Record<string, DeliveryWithRelations[]> = {};
    deliveries.forEach(d => {
      if (d.scheduledDate) {
        const dateKey = d.scheduledDate;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(d);
      }
    });
    return map;
  }, [deliveries]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  }, [currentDate]);

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(formatDateKey(new Date()));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const selectedDateDeliveries = selectedDate ? deliveriesByDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon className="text-red-400" size={24} />
              <h1 className="text-xl font-bold text-white">Delivery Calendar</h1>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-white border border-white/50 rounded-lg hover:bg-white/10 transition"
              data-testid="button-today"
            >
              Today
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              data-testid="button-prev-month"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              data-testid="button-next-month"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array(42).fill(0).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, isCurrentMonth }, i) => {
                const dateKey = formatDateKey(date);
                const dayDeliveries = deliveriesByDate[dateKey] || [];
                const hasDeliveries = dayDeliveries.length > 0;
                const isSelected = selectedDate === dateKey;
                const isTodayDate = isToday(date);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`aspect-square p-1 rounded-lg text-sm transition relative ${
                      !isCurrentMonth ? 'text-gray-300' : 
                      isSelected ? 'bg-red-600 text-white' :
                      isTodayDate ? 'bg-red-100 text-red-600 font-bold' :
                      'hover:bg-gray-100'
                    }`}
                    data-testid={`calendar-day-${dateKey}`}
                  >
                    <span className="block">{date.getDate()}</span>
                    {hasDeliveries && (
                      <div className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5`}>
                        {dayDeliveries.slice(0, 3).map((_, idx) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-600'}`}
                          />
                        ))}
                        {dayDeliveries.length > 3 && (
                          <span className={`text-[8px] ${isSelected ? 'text-white' : 'text-red-600'}`}>+</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {selectedDate && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              {(role === 'sales' || role === 'dealer') && dealerId && (
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  data-testid="button-schedule-delivery"
                >
                  <Plus size={18} />
                  Schedule Delivery
                </button>
              )}
            </div>
            
            {selectedDateDeliveries.length === 0 ? (
              <Card className="p-6 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No deliveries scheduled</p>
                {(role === 'sales' || role === 'dealer') && dealerId && (
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                    data-testid="button-schedule-delivery-empty"
                  >
                    Schedule a Delivery
                  </button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {selectedDateDeliveries.sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || '')).map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {delivery.scheduledTime && (
                            <span className="flex items-center gap-1 text-sm font-semibold text-red-600">
                              <Clock size={14} />
                              {formatTime(delivery.scheduledTime)}
                            </span>
                          )}
                          <StatusBadge status={(delivery.status || 'pending') as any} />
                        </div>
                        <p className="font-semibold">
                          {delivery.year} {delivery.make} {delivery.model}
                        </p>
                        <p className="text-sm text-gray-600">VIN: {delivery.vin}</p>
                        
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600">{delivery.dropoff}</span>
                          </div>
                          {role === 'sales' && delivery.driver && (
                            <div className="flex items-center gap-2">
                              <Truck size={14} className="text-gray-400" />
                              <span className="text-gray-600">Driver: {delivery.driver.name}</span>
                            </div>
                          )}
                          {role === 'driver' && delivery.sales && (
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="text-gray-600">Requested by: {delivery.sales.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/delivery/${delivery.id}`)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        data-testid={`button-view-${delivery.id}`}
                      >
                        View
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {!selectedDate && deliveries.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Upcoming Scheduled Deliveries</h3>
            <div className="space-y-3">
              {deliveries
                .filter(d => d.scheduledDate && d.scheduledDate >= formatDateKey(new Date()))
                .sort((a, b) => {
                  const dateA = `${a.scheduledDate}T${a.scheduledTime || '00:00'}`;
                  const dateB = `${b.scheduledDate}T${b.scheduledTime || '00:00'}`;
                  return dateA.localeCompare(dateB);
                })
                .slice(0, 5)
                .map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-600">
                            {delivery.scheduledDate && new Date(delivery.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          {delivery.scheduledTime && (
                            <span className="text-sm text-red-600">
                              {formatTime(delivery.scheduledTime)}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold">
                          {delivery.year} {delivery.make} {delivery.model}
                        </p>
                        <p className="text-sm text-gray-600">{delivery.dropoff}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/delivery/${delivery.id}`)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                      >
                        View
                      </button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>

      {selectedDate && dealerId && (role === 'sales' || role === 'dealer') && (
        <ScheduleDeliveryModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          selectedDate={selectedDate}
          dealerId={dealerId}
          salesId={salesData?.id || ''}
          defaultPickupAddress={salesData ? {
            street: salesData.defaultPickupStreet || '',
            city: salesData.defaultPickupCity || '',
            state: salesData.defaultPickupState || '',
            zip: salesData.defaultPickupZip || '',
          } : undefined}
          onSuccess={() => loadScheduledDeliveries()}
          showToast={showToast}
        />
      )}
    </div>
  );
}
