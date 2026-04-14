import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Package, Search, Truck, Clock, CheckCircle, X, Settings, Mail, Phone, Building2, Calendar, Camera, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import type { Sales, Delivery, Driver, AddressFields, DeliveryTimeframe, Dealer } from '../../shared/schema';
import { EmptyState } from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { DriverSelectionModal } from '../components/sales/DriverSelectionModal';
import { ScheduleDeliveryModal } from '../components/calendar/ScheduleDeliveryModal';
import { AddressInput } from '../components/ui/AddressInput';
import { getVehicleYears, VEHICLE_MAKES, getModelsForMake, TRANSMISSION_TYPES } from '../lib/vehicleData';
import { formatAddress } from '../lib/addressUtils';
import { validateVIN } from '../lib/validation';
import { DeliveryPhotoUpload } from '../components/delivery/DeliveryPhotoUpload';
import { DeliveryPhotoGallery } from '../components/delivery/DeliveryPhotoGallery';

export function SalesDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sales | null>(null);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showNewDelivery, setShowNewDelivery] = useState(false);
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [activeTab, setActiveTab] = useState<'profile' | 'deliveries' | 'chat' | 'calendar'>('profile');
  
  // Chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [scheduledDeliveries, setScheduledDeliveries] = useState<Delivery[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDriverSelection, setShowDriverSelection] = useState(false);
  const [deliveryToCancel, setDeliveryToCancel] = useState<string | null>(null);
  const [vinError, setVinError] = useState('');
  const [expandedPhotoDeliveryId, setExpandedPhotoDeliveryId] = useState<string | null>(null);
  const [photoRefreshTrigger, setPhotoRefreshTrigger] = useState(0);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [newDelivery, setNewDelivery] = useState({
    pickupAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
    dropoffAddress: { street: '', city: '', state: '', zip: '' } as AddressFields,
    vin: '',
    notes: '',
    driverId: '',
    year: '',
    make: '',
    model: '',
    transmission: '',
    serviceType: 'delivery' as 'delivery' | 'swap',
    hasTrade: false,
    requiresSecondDriver: false,
    requiredTimeframe: '' as DeliveryTimeframe | '',
  });

  useEffect(() => {
    if (user) loadSalesData();
  }, [user]);

  useEffect(() => {
    if (!user || !sales) return;
    const pollInterval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        await loadDeliveries(sales.id);
      }
    }, 15000);
    return () => clearInterval(pollInterval);
  }, [user, sales?.id]);

  const loadSalesData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const salesData = await api.sales.current();
      if (salesData) {
        setSales(salesData);
        if (salesData.dealerId) {
          const dealerData = await api.dealers.get(salesData.dealerId);
          if (dealerData) setDealer(dealerData);
        }
        if (salesData.defaultPickupStreet) {
          setNewDelivery(prev => ({
            ...prev,
            pickupAddress: {
              street: salesData.defaultPickupStreet || '',
              city: salesData.defaultPickupCity || '',
              state: salesData.defaultPickupState || '',
              zip: salesData.defaultPickupZip || '',
            }
          }));
        }
        await Promise.all([
          loadDeliveries(salesData.id),
          loadDrivers(salesData.dealerId)
        ]);
      } else {
        showToast('Sales profile not found. Please contact your administrator.', 'error');
      }
    } catch (err) {
      console.error('Error loading sales data:', err);
      showToast('An unexpected error occurred.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = useCallback(async (salesId: string) => {
    try {
      const data = await api.deliveries.bySales(salesId);
      if (data) setDeliveries(data);
    } catch (err) {
      console.error('Error loading deliveries:', err);
    }
  }, []);

  const loadDrivers = async (dealerId: string) => {
    try {
      const data = await api.drivers.approvedByDealer(dealerId);
      if (data) {
        setDrivers(data.filter((d: Driver) => d.isAvailable));
      }
    } catch (err) {
      console.error('Error loading drivers:', err);
    }
  };

  // Load conversations for chat tab
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setChatLoading(true);
    try {
      const data = await api.conversations.list();
      setConversations(data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setChatLoading(false);
    }
  }, [user]);

  // Load scheduled deliveries for calendar tab
  const loadScheduledDeliveries = useCallback(async () => {
    if (!user) return;
    setCalendarLoading(true);
    try {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth() + 1;
      const data = await api.deliveries.scheduled(year, month);
      setScheduledDeliveries(data || []);
    } catch (err) {
      console.error('Error loading scheduled deliveries:', err);
    } finally {
      setCalendarLoading(false);
    }
  }, [user, calendarDate]);

  // Handle chat tab polling
  useEffect(() => {
    if (activeTab === 'chat') {
      loadConversations();
      chatPollingRef.current = setInterval(loadConversations, 10000);
    }
    return () => {
      if (chatPollingRef.current) {
        clearInterval(chatPollingRef.current);
        chatPollingRef.current = null;
      }
    };
  }, [activeTab, loadConversations]);

  // Handle calendar tab loading
  useEffect(() => {
    if (activeTab === 'calendar') {
      loadScheduledDeliveries();
    }
  }, [activeTab, loadScheduledDeliveries]);

  // Calendar helpers
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      const date = new Date(year, month, -firstDay.getDay() + i + 1);
      days.push({ date, isCurrentMonth: false });
    }
    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Days from next month
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [calendarDate]);

  const deliveriesByDate = useMemo(() => {
    const map: Record<string, Delivery[]> = {};
    scheduledDeliveries.forEach(d => {
      if (d.scheduledDate) {
        const dateKey = d.scheduledDate;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(d);
      }
    });
    return map;
  }, [scheduledDeliveries]);

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sales || isCreatingDelivery) return;

    const vinValidation = validateVIN(newDelivery.vin);
    if (!vinValidation.isValid) {
      setVinError(vinValidation.message);
      showToast('Please enter a valid 17-character VIN', 'error');
      return;
    }

    setIsCreatingDelivery(true);
    try {
      const createdDelivery = await api.deliveries.create({
        dealerId: sales.dealerId,
        salesId: sales.id,
        driverId: newDelivery.driverId || null,
        pickup: formatAddress(newDelivery.pickupAddress),
        dropoff: formatAddress(newDelivery.dropoffAddress),
        pickupStreet: newDelivery.pickupAddress.street,
        pickupCity: newDelivery.pickupAddress.city,
        pickupState: newDelivery.pickupAddress.state,
        pickupZip: newDelivery.pickupAddress.zip,
        dropoffStreet: newDelivery.dropoffAddress.street,
        dropoffCity: newDelivery.dropoffAddress.city,
        dropoffState: newDelivery.dropoffAddress.state,
        dropoffZip: newDelivery.dropoffAddress.zip,
        vin: newDelivery.vin,
        notes: newDelivery.notes,
        status: newDelivery.driverId ? 'pending_driver_acceptance' : 'pending',
        year: parseInt(newDelivery.year) || null,
        make: newDelivery.make || null,
        model: newDelivery.model || null,
        transmission: newDelivery.transmission || null,
        serviceType: newDelivery.serviceType,
        hasTrade: newDelivery.serviceType === 'delivery' ? newDelivery.hasTrade : null,
        requiresSecondDriver: newDelivery.serviceType === 'delivery' ? newDelivery.requiresSecondDriver : null,
        requiredTimeframe: newDelivery.requiredTimeframe || null,
      });

      if (newDelivery.driverId) {
        const assignedDriver = await api.drivers.get(newDelivery.driverId);
        if (assignedDriver?.userId) {
          await api.notifications.create({
            userId: assignedDriver.userId,
            deliveryId: createdDelivery?.id ?? null,
            type: 'delivery_request',
            title: 'New Delivery Request',
            message: `${sales.name} has requested you for a delivery (VIN: ${newDelivery.vin}).`,
            read: false,
          });
        }
      }

      showToast('Delivery request created!', 'success');
      setShowNewDelivery(false);
      setFormStep(1);
      resetForm();
      await loadDeliveries(sales.id);
    } catch (err) {
      console.error('Error creating delivery:', err);
      showToast('Failed to create delivery', 'error');
    } finally {
      setIsCreatingDelivery(false);
    }
  };

  const resetForm = () => {
    setNewDelivery({
      pickupAddress: sales?.defaultPickupStreet ? {
        street: sales.defaultPickupStreet,
        city: sales.defaultPickupCity || '',
        state: sales.defaultPickupState || '',
        zip: sales.defaultPickupZip || '',
      } : { street: '', city: '', state: '', zip: '' },
      dropoffAddress: { street: '', city: '', state: '', zip: '' },
      vin: '',
      notes: '',
      driverId: '',
      year: '',
      make: '',
      model: '',
      transmission: '',
      serviceType: 'delivery',
      hasTrade: false,
      requiresSecondDriver: false,
      requiredTimeframe: '',
    });
    setVinError('');
  };

  const handleCancelDelivery = async () => {
    if (!deliveryToCancel || !sales) return;
    try {
      await api.deliveries.update(deliveryToCancel, { status: 'cancelled' });
      showToast('Delivery cancelled', 'success');
      setDeliveryToCancel(null);
      await loadDeliveries(sales.id);
    } catch (err) {
      showToast('Failed to cancel delivery', 'error');
    }
  };

  const filteredDeliveries = useMemo(() => {
    let filtered = deliveries;
    if (activeFilter === 'active') {
      filtered = filtered.filter(d => !['completed', 'cancelled'].includes(d.status || ''));
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(d => d.status === 'completed');
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.vin?.toLowerCase().includes(query) ||
        d.pickup?.toLowerCase().includes(query) ||
        d.dropoff?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [deliveries, activeFilter, searchQuery]);

  const stats = useMemo(() => ({
    active: deliveries.filter(d => !['completed', 'cancelled'].includes(d.status || '')).length,
    pending: deliveries.filter(d => d.status === 'pending' || d.status === 'pending_driver_acceptance').length,
    completed: deliveries.filter(d => d.status === 'completed').length,
  }), [deliveries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!sales) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
          <p className="text-gray-600">Please contact your dealership administrator.</p>
        </Card>
      </div>
    );
  }

  const initials = sales.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pb-12">
      {/* Compact Header */}
      <div className="bg-neutral-900/50 border-b border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Sales Dashboard</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/conversations')}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
                data-testid="button-messages"
              >
                <MessageCircle size={20} />
              </button>
              <button
                onClick={() => navigate('/calendar')}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
                data-testid="button-calendar"
              >
                <Calendar size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-800/50 border-b border-neutral-700 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'deliveries', label: 'Deliveries', count: stats.active },
              { id: 'chat', label: 'Chat', count: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0) },
              { id: 'calendar', label: 'Calendar' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 font-medium transition border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-red-400 border-red-400'
                    : 'text-gray-500 border-transparent hover:text-white'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-red-700/50 text-red-300 text-xs px-2 py-0.5 rounded-full">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Card */}
            <Card className="p-6 relative bg-neutral-800 border-neutral-700">
              <div className="flex flex-col items-center">
                {/* Avatar with Camera */}
                <div className="relative mb-4">
                  <div className="w-28 h-28 rounded-full bg-neutral-700 flex items-center justify-center text-gray-300 text-3xl font-bold border-4 border-neutral-600 shadow-lg">
                    {initials}
                  </div>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-700 transition"
                    data-testid="button-edit-photo"
                  >
                    <Camera size={18} />
                  </button>
                </div>
                
                {/* Name */}
                <h2 className="text-2xl font-bold text-white">{sales.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Tap photo to update</p>
                
                {/* Role Badge */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-700 text-gray-300 rounded-full text-sm font-medium">
                    <Package size={14} />
                    Sales
                  </span>
                  {sales.role && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-700 text-gray-300 rounded-full text-sm font-medium">
                      {sales.role}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Dealership */}
              <div className="mt-6 pt-6 border-t border-neutral-600 text-center">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Building2 size={18} className="text-gray-400" />
                  <span className="font-semibold">{dealer?.name || 'Dealership'}</span>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 text-white">
                  <Phone size={18} className="text-gray-400" />
                  <span className="font-medium">{sales.phone || 'No phone added'}</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <Mail size={18} className="text-gray-400" />
                  <span className="font-medium">{sales.email}</span>
                </div>
              </div>
              
              {/* Message Button */}
              <button
                onClick={() => navigate('/conversations')}
                className="absolute top-6 right-6 p-3 bg-neutral-700 rounded-full hover:bg-neutral-600 transition"
                data-testid="button-messages-profile"
              >
                <MessageCircle size={20} className="text-gray-300" />
              </button>
            </Card>
            
            {/* New Delivery Button */}
            <button
              onClick={() => { setShowNewDelivery(true); setFormStep(1); }}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2 shadow-lg"
              data-testid="button-new-delivery"
            >
              <Plus size={24} />
              Request New Delivery
            </button>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <Clock className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </Card>
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <Truck className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-xs text-gray-500">Active</p>
              </Card>
              <Card className="p-4 text-center bg-neutral-800 border-neutral-700">
                <CheckCircle className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-gray-500">Completed</p>
              </Card>
            </div>
            
            {/* Settings Link */}
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-4 bg-neutral-800 rounded-xl border border-neutral-700 hover:bg-neutral-700 transition"
              data-testid="button-settings"
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-gray-400" />
                <span className="font-medium text-white">Account Settings</span>
              </div>
              <span className="text-gray-500">→</span>
            </button>
          </div>
        )}
        
        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2">
                {(['active', 'completed', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      activeFilter === filter
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    data-testid={`filter-${filter}`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by VIN or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Deliveries List */}
            {filteredDeliveries.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No deliveries"
                description={activeFilter === 'active' ? "You don't have any active deliveries" : "No deliveries found"}
              />
            ) : (
              <div className="space-y-3">
                {filteredDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">
                            {delivery.year} {delivery.make} {delivery.model}
                          </p>
                          <StatusBadge status={(delivery.status || 'pending') as any} />
                        </div>
                        <p className="text-sm text-gray-600">VIN: {delivery.vin}</p>
                        <p className="text-xs text-gray-500 mt-1">To: {delivery.dropoff}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/delivery/${delivery.id}`)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                          data-testid={`button-view-${delivery.id}`}
                        >
                          View
                        </button>
                        {delivery.status === 'pending' && (
                          <button
                            onClick={() => setDeliveryToCancel(delivery.id)}
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedPhotoDeliveryId(expandedPhotoDeliveryId === delivery.id ? null : delivery.id)}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1"
                          data-testid={`button-photos-${delivery.id}`}
                        >
                          <Camera size={16} />
                          Photos
                        </button>
                      </div>
                    </div>
                    {expandedPhotoDeliveryId === delivery.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        <DeliveryPhotoUpload
                          deliveryId={delivery.id}
                          uploaderRole="sales"
                          onPhotoUploaded={() => setPhotoRefreshTrigger(prev => prev + 1)}
                        />
                        <DeliveryPhotoGallery
                          deliveryId={delivery.id}
                          currentUserRole="sales"
                          refreshTrigger={photoRefreshTrigger}
                        />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            {/* Quick Schedule Button */}
            {sales?.dealerId && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setSelectedCalendarDate(today);
                    setShowScheduleModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                  data-testid="button-quick-schedule-from-chat"
                >
                  <Plus size={18} />
                  Schedule Delivery
                </button>
              </div>
            )}

            {chatLoading && conversations.length === 0 ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="No conversations yet"
                description="Start chatting when you have active deliveries with drivers"
              />
            ) : (
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <Card
                    key={conv.deliveryId}
                    className="p-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => navigate(`/chat/${conv.deliveryId}`)}
                    data-testid={`chat-conversation-${conv.deliveryId}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <MessageCircle size={20} className="text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{conv.otherPartyName || 'Driver'}</p>
                          <p className="text-sm text-gray-500 truncate max-w-[200px]">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                        <StatusBadge status={conv.delivery?.status || 'pending'} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-lg font-semibold">
                {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h3>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Calendar Grid */}
            <Card className="p-4">
              {calendarLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS.map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, idx) => {
                      const dateStr = day.date.toISOString().split('T')[0];
                      const dayDeliveries = deliveriesByDate[dateStr] || [];
                      const isToday = new Date().toDateString() === day.date.toDateString();
                      const isSelected = selectedCalendarDate === dateStr;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedCalendarDate(dateStr)}
                          className={`p-2 text-center rounded-lg min-h-[60px] relative cursor-pointer transition ${
                            !day.isCurrentMonth ? 'text-gray-500' :
                            isSelected ? 'bg-red-600 text-white' :
                            isToday ? 'bg-red-900/30 text-red-400 font-bold' :
                            dayDeliveries.length > 0 ? 'bg-neutral-700 hover:bg-neutral-600 text-gray-200' :
                            'hover:bg-neutral-700 text-gray-300'
                          }`}
                          data-testid={`calendar-day-${dateStr}`}
                        >
                          <span className="text-sm">{day.date.getDate()}</span>
                          {dayDeliveries.length > 0 && (
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                              <span className={`w-2 h-2 rounded-full block ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>

            {/* Selected Date Section */}
            {selectedCalendarDate && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-200">
                    {new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                      data-testid="button-schedule-delivery"
                    >
                      <Plus size={16} />
                      Schedule Delivery
                    </button>
                    <button onClick={() => setSelectedCalendarDate(null)} className="text-gray-400 hover:text-gray-200">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                {deliveriesByDate[selectedCalendarDate]?.length > 0 ? (
                  <div className="space-y-3">
                    {deliveriesByDate[selectedCalendarDate].map(delivery => (
                      <div key={delivery.id} className="p-3 bg-neutral-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-200">{delivery.year} {delivery.make} {delivery.model}</p>
                            <p className="text-sm text-gray-400">
                              {delivery.scheduledTime ? `Scheduled: ${delivery.scheduledTime}` : 'Time TBD'}
                            </p>
                          </div>
                          <StatusBadge status={(delivery.status || 'pending') as any} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No deliveries scheduled for this date.</p>
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* New Delivery Modal */}
      {showNewDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Request Delivery</h2>
                <p className="text-sm text-gray-600">Step {formStep} of 3</p>
              </div>
              <button onClick={() => { setShowNewDelivery(false); setFormStep(1); resetForm(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="p-6">
              {/* Step 1: Vehicle Info */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Vehicle Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Year</label>
                      <select
                        required
                        value={newDelivery.year}
                        onChange={(e) => setNewDelivery({ ...newDelivery, year: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select</option>
                        {getVehicleYears().map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Make</label>
                      <select
                        required
                        value={newDelivery.make}
                        onChange={(e) => setNewDelivery({ ...newDelivery, make: e.target.value, model: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select</option>
                        {VEHICLE_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Model</label>
                      <select
                        required
                        value={newDelivery.model}
                        onChange={(e) => setNewDelivery({ ...newDelivery, model: e.target.value })}
                        disabled={!newDelivery.make}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                      >
                        <option value="">{newDelivery.make ? 'Select' : 'Pick make first'}</option>
                        {newDelivery.make && getModelsForMake(newDelivery.make).map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Transmission</label>
                      <select
                        required
                        value={newDelivery.transmission}
                        onChange={(e) => setNewDelivery({ ...newDelivery, transmission: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select</option>
                        {TRANSMISSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">VIN</label>
                    <input
                      type="text"
                      required
                      maxLength={17}
                      placeholder="17-character VIN"
                      value={newDelivery.vin}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase();
                        setNewDelivery({ ...newDelivery, vin: v });
                        setVinError(v.length > 0 && !validateVIN(v).isValid ? validateVIN(v).message : '');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg font-mono ${vinError ? 'border-red-500' : 'border-gray-300'}`}
                      data-testid="input-vin"
                    />
                    {vinError && <p className="text-sm text-red-600 mt-1">{vinError}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormStep(2)}
                    disabled={!newDelivery.year || !newDelivery.make || !newDelivery.model || !newDelivery.transmission || !newDelivery.vin || newDelivery.vin.length !== 17 || vinError !== ''}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    Next: Locations
                  </button>
                </div>
              )}

              {/* Step 2: Locations */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Pickup & Dropoff</h3>
                  <AddressInput
                    label="Pickup Location"
                    value={newDelivery.pickupAddress}
                    onChange={(addr) => setNewDelivery({ ...newDelivery, pickupAddress: addr })}
                    required
                  />
                  <AddressInput
                    label="Dropoff Location"
                    value={newDelivery.dropoffAddress}
                    onChange={(addr) => setNewDelivery({ ...newDelivery, dropoffAddress: addr })}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <textarea
                      value={newDelivery.notes}
                      onChange={(e) => setNewDelivery({ ...newDelivery, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="Any special instructions..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setFormStep(1)} className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStep(3)}
                      disabled={
                        !newDelivery.pickupAddress.street || !newDelivery.pickupAddress.city || !newDelivery.pickupAddress.state || !newDelivery.pickupAddress.zip ||
                        !newDelivery.dropoffAddress.street || !newDelivery.dropoffAddress.city || !newDelivery.dropoffAddress.state || !newDelivery.dropoffAddress.zip
                      }
                      className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 transition"
                    >
                      Next: Review
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Review & Submit</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p><span className="font-medium">Vehicle:</span> {newDelivery.year} {newDelivery.make} {newDelivery.model}</p>
                    <p><span className="font-medium">VIN:</span> {newDelivery.vin}</p>
                    <p><span className="font-medium">From:</span> {formatAddress(newDelivery.pickupAddress)}</p>
                    <p><span className="font-medium">To:</span> {formatAddress(newDelivery.dropoffAddress)}</p>
                    {newDelivery.notes && <p><span className="font-medium">Notes:</span> {newDelivery.notes}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Assign Driver (optional)</label>
                    {newDelivery.driverId ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <span>{drivers.find(d => d.id === newDelivery.driverId)?.name}</span>
                        <button type="button" onClick={() => setNewDelivery({ ...newDelivery, driverId: '' })} className="text-red-600 text-sm">Remove</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDriverSelection(true)}
                        className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        + Select a Driver
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setFormStep(2)} className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
                      Back
                    </button>
                    <button type="submit" disabled={isCreatingDelivery} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed" data-testid="button-submit-delivery">
                      {isCreatingDelivery ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Driver Selection Modal */}
      {showDriverSelection && sales && user && (
        <DriverSelectionModal
          isOpen={showDriverSelection}
          onClose={() => setShowDriverSelection(false)}
          onSelectDriver={(driverId: string) => {
            setNewDelivery({ ...newDelivery, driverId });
            setShowDriverSelection(false);
          }}
          dealerId={sales.dealerId}
          currentUserId={user.id}
        />
      )}

      {/* Cancel Confirmation */}
      {deliveryToCancel && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setDeliveryToCancel(null)}
          title="Cancel Delivery"
          message="Are you sure you want to cancel this delivery request?"
          confirmText="Yes, Cancel"
          onConfirm={handleCancelDelivery}
          variant="danger"
        />
      )}

      {/* Schedule Delivery Modal */}
      {selectedCalendarDate && sales?.dealerId && (
        <ScheduleDeliveryModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          selectedDate={selectedCalendarDate}
          dealerId={sales.dealerId}
          salesId={sales.id}
          defaultPickupAddress={{
            street: sales.defaultPickupStreet || '',
            city: sales.defaultPickupCity || '',
            state: sales.defaultPickupState || '',
            zip: sales.defaultPickupZip || '',
          }}
          onSuccess={() => {
            loadScheduledDeliveries();
            if (sales?.id) loadDeliveries(sales.id);
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
