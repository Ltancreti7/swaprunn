import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle2, Inbox, Building2, Search, Truck, Play, X, MessageCircle, Settings, Mail, Phone, Star, MapPinned, Calendar, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import type { Driver, Delivery, Dealer, ApprovedDriverDealer } from '../../shared/schema';
import { StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/LoadingSkeleton';
import { DealershipSearch } from '../components/driver/DealershipSearch';
import { EditProfileModal } from '../components/driver/EditProfileModal';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
import { DeliveryPhotoUpload } from '../components/delivery/DeliveryPhotoUpload';
import { DeliveryPhotoGallery } from '../components/delivery/DeliveryPhotoGallery';

interface DeliveryWithDealer extends Delivery {
  dealer: Dealer;
  sales?: { name: string } | null;
}

interface DealershipWithStats extends ApprovedDriverDealer {
  dealer: Dealer;
}

export function DriverDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { unreadCount } = useUnreadMessagesCount(user?.id);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [requestDeliveries, setRequestDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<DeliveryWithDealer[]>([]);
  const [approvedDealerships, setApprovedDealerships] = useState<DealershipWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'action' | 'history' | 'dealerships' | 'find'>('profile');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [showDealerSearch, setShowDealerSearch] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoRefreshTrigger, setPhotoRefreshTrigger] = useState(0);
  const [showPhotos, setShowPhotos] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) loadDriverData();
  }, [user]);

  useEffect(() => {
    if (!user || !driver) return;
    const POLLING_INTERVAL = 15000;
    let isVisible = true;

    const pollDeliveries = async () => {
      if (!isVisible) return;
      try {
        await Promise.all([
          loadRequestDeliveries(driver.id),
          loadUpcomingDeliveries(driver.id),
        ]);
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const handleVisibility = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) pollDeliveries();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    pollingIntervalRef.current = setInterval(pollDeliveries, POLLING_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [user, driver?.id]);

  const loadDriverData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const driverData = await api.drivers.current();
      if (driverData) {
        setDriver(driverData as Driver);
        await Promise.all([
          loadRequestDeliveries(driverData.id),
          loadUpcomingDeliveries(driverData.id),
          loadRecentDeliveries(driverData.id),
          loadApprovedDealerships(driverData.id),
        ]);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
    setLoading(false);
  };

  const loadRequestDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.requestsForDriver(driverId);
      setRequestDeliveries((data || []) as DeliveryWithDealer[]);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadUpcomingDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'accepted,assigned,in_progress');
      setUpcomingDeliveries((data || []) as DeliveryWithDealer[]);
    } catch (error) {
      console.error('Error loading upcoming:', error);
    }
  };

  const loadRecentDeliveries = async (driverId: string) => {
    try {
      const data = await api.deliveries.byDriver(driverId, 'completed');
      setRecentDeliveries(((data || []) as DeliveryWithDealer[]).slice(0, 10));
    } catch (error) {
      console.error('Error loading recent:', error);
    }
  };

  const loadApprovedDealerships = async (driverId: string) => {
    try {
      const data = await api.approvedDriverDealers.byDriver(driverId);
      setApprovedDealerships((data || []) as DealershipWithStats[]);
    } catch (error) {
      console.error('Error loading dealerships:', error);
    }
  };

  const handleAcceptDelivery = async (deliveryId: string) => {
    if (!driver) return;
    try {
      await api.deliveries.accept(deliveryId, driver.id);
      showToast('Delivery accepted!', 'success');
      await loadRequestDeliveries(driver.id);
      await loadUpcomingDeliveries(driver.id);
    } catch (err: any) {
      showToast(err.message || 'Failed to accept delivery', 'error');
    }
  };

  const handleDeclineDelivery = async (deliveryId: string) => {
    console.log('handleDeclineDelivery called with:', deliveryId, 'driver:', driver?.id);
    if (!driver) {
      console.log('No driver found, returning');
      return;
    }
    try {
      console.log('Calling api.deliveries.decline');
      await api.deliveries.decline(deliveryId, driver.id);
      console.log('Decline successful');
      showToast('Delivery declined', 'info');
      await loadRequestDeliveries(driver.id);
    } catch (err: any) {
      console.error('Decline error:', err);
      showToast(err.message || 'Failed to decline', 'error');
    }
  };

  const toggleAvailability = async () => {
    if (!driver) return;
    try {
      const newStatus = !driver.isAvailable;
      await api.drivers.update(driver.id, { isAvailable: newStatus });
      setDriver({ ...driver, isAvailable: newStatus });
      showToast(newStatus ? "You're now available" : "You're now offline", 'success');
    } catch (err) {
      showToast('Failed to update availability', 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !driver) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const urlResponse = await fetch('/api/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL, objectPath } = await urlResponse.json();

      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      await api.drivers.update(driver.id, { profileImage: objectPath });
      setDriver({ ...driver, profileImage: objectPath });
      showToast('Profile photo updated!', 'success');
    } catch (err) {
      console.error('Photo upload error:', err);
      showToast('Failed to upload photo', 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 p-4">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Truck className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-white">Driver Profile Not Found</h2>
          <p className="text-neutral-400">Please complete your registration.</p>
        </Card>
      </div>
    );
  }

  const nextDelivery = upcomingDeliveries[0];
  const initials = driver.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'D';
  const verifiedCount = approvedDealerships.filter(d => d.isVerified).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 pb-12">
      {/* Compact Header */}
      <div className="bg-neutral-900/50 border-b border-neutral-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Driver Dashboard</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/conversations')}
                className="relative p-2 bg-white/20 rounded-full hover:bg-white/30 transition text-white"
                data-testid="button-messages"
              >
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
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
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'profile', label: 'Profile' },
              { id: 'action', label: 'Jobs', count: requestDeliveries.length + upcomingDeliveries.length },
              { id: 'history', label: 'History' },
              { id: 'dealerships', label: 'My Dealerships', count: approvedDealerships.length },
              { id: 'find', label: 'Find Dealerships' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-4 font-medium transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-red-400 border-red-400'
                    : 'text-neutral-400 border-transparent hover:text-white'
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
                  {driver.profileImage ? (
                    <img
                      src={driver.profileImage}
                      alt={driver.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-neutral-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300 text-3xl font-bold border-4 border-neutral-600 shadow-lg">
                      {initials}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                    data-testid="input-profile-photo"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 w-9 h-9 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-700 transition disabled:opacity-50"
                    data-testid="button-edit-photo"
                  >
                    {isUploadingPhoto ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                  </button>
                </div>
                
                {/* Name */}
                <h2 className="text-2xl font-bold text-white">{driver.name}</h2>
                <p className="text-sm text-neutral-500 mt-1">Tap photo to update</p>
                
                {/* Role Badge */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium">
                    <Truck size={14} />
                    Driver
                  </span>
                  {driver.canDriveManual && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-700 text-neutral-300 rounded-full text-sm font-medium">
                      Manual Trans
                    </span>
                  )}
                </div>
                
                {/* Rating */}
                <div className="flex items-center gap-1 mt-3">
                  <Star size={20} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-white">New Driver</span>
                </div>
              </div>
              
              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-neutral-700 space-y-3">
                <div className="flex items-center gap-3 text-neutral-300">
                  <Phone size={18} className="text-neutral-500" />
                  <span>{driver.phone || 'No phone added'}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <Mail size={18} className="text-neutral-500" />
                  <span>{driver.email}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-300">
                  <MapPinned size={18} className="text-neutral-400" />
                  <span>{driver.radius || 50} mile service radius</span>
                </div>
              </div>
              
              {/* Message Button */}
              <button
                onClick={() => navigate('/conversations')}
                className="absolute top-6 right-6 p-3 bg-neutral-700 rounded-full hover:bg-neutral-600 transition"
                data-testid="button-messages-profile"
              >
                <MessageCircle size={20} className="text-neutral-400" />
              </button>
            </Card>
            
            {/* Availability Toggle */}
            <button
              onClick={toggleAvailability}
              className={`w-full py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-lg ${
                driver.isAvailable
                  ? 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600 border border-neutral-500'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              data-testid="button-toggle-availability"
            >
              {driver.isAvailable ? 'Go Offline' : 'Go Online - Start Accepting Jobs'}
            </button>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-2">
              <Card className="p-3 text-center bg-neutral-800 border-neutral-700">
                <p className="text-xl font-bold text-white">{requestDeliveries.length}</p>
                <p className="text-xs text-neutral-400">Requests</p>
              </Card>
              <Card className="p-3 text-center bg-neutral-800 border-neutral-700">
                <p className="text-xl font-bold text-white">{upcomingDeliveries.length}</p>
                <p className="text-xs text-neutral-400">Active</p>
              </Card>
              <Card className="p-3 text-center bg-neutral-800 border-neutral-700">
                <p className="text-xl font-bold text-white">{recentDeliveries.length}</p>
                <p className="text-xs text-neutral-400">Completed</p>
              </Card>
              <Card className="p-3 text-center bg-neutral-800 border-neutral-700">
                <p className="text-xl font-bold text-white">{verifiedCount}</p>
                <p className="text-xs text-neutral-400">Verified</p>
              </Card>
            </div>
            
            {/* Settings Link */}
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-between p-4 bg-neutral-800 rounded-xl border border-neutral-700 hover:bg-neutral-700 transition"
              data-testid="button-settings"
            >
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-neutral-400" />
                <span className="font-medium text-white">Account Settings</span>
              </div>
              <span className="text-neutral-400">→</span>
            </button>
          </div>
        )}
        
        {/* JOBS TAB */}
        {activeTab === 'action' && (
          <div className="space-y-6">
            {/* Next Delivery Card */}
            {nextDelivery && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Your Next Delivery</h2>
                <Card className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-lg">
                        {nextDelivery.year} {nextDelivery.make} {nextDelivery.model}
                      </p>
                      <p className="text-sm text-neutral-400">{nextDelivery.dealer?.name}</p>
                    </div>
                    <StatusBadge status={(nextDelivery.status || 'assigned') as any} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-neutral-400 mt-0.5" />
                      <div>
                        <p className="text-neutral-400">Pickup</p>
                        <p className="font-medium">{nextDelivery.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-red-500 mt-0.5" />
                      <div>
                        <p className="text-neutral-400">Dropoff</p>
                        <p className="font-medium">{nextDelivery.dropoff}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/delivery/${nextDelivery.id}`)}
                    className="w-full mt-4 py-3 bg-neutral-600 text-white rounded-lg font-semibold hover:bg-neutral-500 transition flex items-center justify-center gap-2"
                    data-testid="button-start-delivery"
                  >
                    <Play size={20} />
                    View Delivery
                  </button>
                  <div className="mt-4 border-t border-neutral-700 pt-4">
                    <button
                      onClick={() => setShowPhotos(!showPhotos)}
                      className="flex items-center justify-between w-full text-sm font-medium text-neutral-300"
                      data-testid="button-toggle-photos"
                    >
                      <span className="flex items-center gap-2">
                        <Camera size={16} />
                        Delivery Photos
                      </span>
                      <span className="text-neutral-500">{showPhotos ? '▲' : '▼'}</span>
                    </button>
                    {showPhotos && (
                      <div className="mt-3 space-y-4">
                        <DeliveryPhotoUpload
                          deliveryId={nextDelivery.id}
                          uploaderRole="driver"
                          onPhotoUploaded={() => setPhotoRefreshTrigger(prev => prev + 1)}
                        />
                        <DeliveryPhotoGallery
                          deliveryId={nextDelivery.id}
                          currentUserRole="driver"
                          refreshTrigger={photoRefreshTrigger}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* Pending Requests */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Delivery Requests {requestDeliveries.length > 0 && `(${requestDeliveries.length})`}
              </h2>
              {requestDeliveries.length === 0 ? (
                <Card className="p-6 text-center">
                  <Inbox className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
                  <p className="text-neutral-400">No pending requests</p>
                  <p className="text-sm text-neutral-500 mt-1">New delivery requests will appear here</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {requestDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{delivery.year} {delivery.make} {delivery.model}</p>
                          <p className="text-sm text-neutral-400">{delivery.dealer?.name}</p>
                        </div>
                        <StatusBadge status="pending" />
                      </div>
                      <p className="text-sm text-neutral-400 mb-1">VIN: {delivery.vin}</p>
                      <p className="text-sm text-neutral-400 mb-3">To: {delivery.dropoff}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                          data-testid={`button-accept-${delivery.id}`}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineDelivery(delivery.id)}
                          className="flex-1 py-2 border border-neutral-600 text-neutral-300 rounded-lg font-medium hover:bg-neutral-700 transition"
                          data-testid={`button-decline-${delivery.id}`}
                        >
                          Decline
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Deliveries */}
            {upcomingDeliveries.length > 1 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Upcoming ({upcomingDeliveries.length - 1})</h2>
                <div className="space-y-3">
                  {upcomingDeliveries.slice(1).map((delivery) => (
                    <Card key={delivery.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{delivery.year} {delivery.make} {delivery.model}</p>
                          <p className="text-sm text-neutral-400">{delivery.dealer?.name}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/delivery/${delivery.id}`)}
                          className="px-4 py-2 border border-neutral-600 rounded-lg text-sm font-medium text-white hover:bg-neutral-700 transition"
                          data-testid={`button-view-${delivery.id}`}
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
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Completed Deliveries</h2>
            {recentDeliveries.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No completed deliveries"
                description="Your completed deliveries will appear here"
              />
            ) : (
              <div className="space-y-3">
                {recentDeliveries.map((delivery) => (
                  <Card key={delivery.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{delivery.year} {delivery.make} {delivery.model}</p>
                        <p className="text-sm text-neutral-400">{delivery.dealer?.name}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {delivery.completedAt && new Date(delivery.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status="completed" />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DEALERSHIPS TAB */}
        {activeTab === 'dealerships' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Dealerships</h2>
              <button
                onClick={() => setShowDealerSearch(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
                data-testid="button-find-dealerships"
              >
                <Search size={18} />
                Find More
              </button>
            </div>

            {approvedDealerships.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="w-16 h-16 text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Dealerships Yet</h3>
                <p className="text-neutral-400 mb-4">Apply to dealerships to start receiving delivery requests</p>
                <button
                  onClick={() => setShowDealerSearch(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                  data-testid="button-find-dealerships-empty"
                >
                  Find Dealerships
                </button>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {approvedDealerships.map((item) => (
                  <Card key={item.dealerId} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.dealer?.name}</p>
                        <p className="text-sm text-neutral-400">{item.dealer?.address}</p>
                        {item.isVerified && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full mt-2">
                            <Star size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FIND DEALERSHIPS TAB */}
        {activeTab === 'find' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Find Dealerships</h2>
            <DealershipSearch
              driverId={driver.id}
              showToast={showToast}
            />
          </div>
        )}
      </div>

      {/* Dealership Search Modal */}
      {showDealerSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-t-lg sm:rounded-lg w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-neutral-700">
            <div className="p-6 border-b border-neutral-700 sticky top-0 bg-neutral-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Find Dealerships</h2>
              <button onClick={() => setShowDealerSearch(false)} className="text-neutral-400 hover:text-white transition" data-testid="button-close-modal">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <DealershipSearch
                driverId={driver.id}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && driver && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          driver={driver}
          onClose={() => setIsEditProfileOpen(false)}
          onSave={async (updates) => {
            await api.drivers.update(driver.id, updates);
            setDriver({ ...driver, ...updates });
            showToast('Profile updated!', 'success');
          }}
        />
      )}
    </div>
  );
}
