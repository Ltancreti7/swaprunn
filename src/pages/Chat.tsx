import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageCircle, AlertCircle, RefreshCw, Calendar, CheckCircle2, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { StatusBadge } from '../components/ui/Badge';
import { formatMessageDate, formatTime } from '../lib/dateUtils';
import { retryWithBackoff, isNetworkError } from '../lib/retry';
import { ScheduleConfirmationModal } from '../components/sales/ScheduleConfirmationModal';
import { ScheduleDeliveryModal } from '../components/calendar/ScheduleDeliveryModal';
import { DeliveryPhotoUpload } from '../components/delivery/DeliveryPhotoUpload';
import { DeliveryPhotoGallery } from '../components/delivery/DeliveryPhotoGallery';
import { getTimeframeDisplay } from '../lib/deliveryUtils';
import api from '../lib/api';
import type { Delivery, Message, Sales, Driver } from '../../shared/schema';

const POLLING_INTERVAL = 5000;

export function Chat() {
  const { deliveryId } = useParams<{ deliveryId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [salesPerson, setSalesPerson] = useState<Sales | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showNewDeliveryModal, setShowNewDeliveryModal] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);
  const [photoRefreshTrigger, setPhotoRefreshTrigger] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadDeliveryWithRelations = useCallback(async () => {
    if (!deliveryId) return;
    try {
      const result = await api.deliveries.getWithRelations(deliveryId);
      if (result) {
        setDelivery(result.delivery);
        if (result.sales) setSalesPerson(result.sales);
        if (result.driver) setDriver(result.driver);
      }
    } catch (error) {
      console.error('Failed to load delivery:', error);
    }
  }, [deliveryId]);

  const loadMessages = useCallback(async () => {
    if (!deliveryId) return;
    try {
      const data = await api.messages.list(deliveryId);
      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [deliveryId]);

  const markMessagesAsRead = useCallback(async () => {
    if (!deliveryId || !user?.id) return;
    try {
      await api.messages.markRead(deliveryId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [deliveryId, user?.id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!deliveryId) return;

    loadDeliveryWithRelations();
    loadMessages();
    markMessagesAsRead();

    pollingRef.current = setInterval(() => {
      loadMessages();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [deliveryId, loadDeliveryWithRelations, loadMessages, markMessagesAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim() || !user || !delivery) {
      return;
    }

    const messageContent = newMessage.trim();
    setLoading(true);
    setSendError(null);

    try {
      let recipientUserId: string | null = null;

      if (driver && user.id !== driver.userId) {
        recipientUserId = driver.userId;
      }

      if (!recipientUserId && salesPerson && user.id !== salesPerson.userId) {
        recipientUserId = salesPerson.userId;
      }

      if (!recipientUserId && delivery.dealerId) {
        try {
          const dealer = await api.dealers.get(delivery.dealerId);
          if (dealer?.userId && user.id !== dealer.userId) {
            recipientUserId = dealer.userId;
          }
        } catch {
          console.error('Failed to get dealer');
        }
      }

      if (!recipientUserId) {
        throw new Error('No recipient available for this delivery');
      }

      let insertedMessage: Message | null = null;

      await retryWithBackoff(async () => {
        const data = await api.messages.create({
          deliveryId: deliveryId,
          senderId: user.id,
          recipientId: recipientUserId,
          content: messageContent,
        });

        if (data) {
          insertedMessage = data as Message;
        }
      }, 3, 1000);

      if (insertedMessage) {
        setMessages((current) => {
          if (current.some(m => m.id === insertedMessage!.id)) {
            return current;
          }
          return [...current, insertedMessage!];
        });
      }

      setNewMessage('');
      setSendError(null);
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(errorMessage);

      if (isNetworkError(err)) {
        showToast('Network error. Message not sent. Please check your connection and try again.', 'error');
      } else {
        showToast(`Failed to send message: ${errorMessage}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!sendError || !newMessage.trim()) return;
    await handleSendMessage({ preventDefault: () => {} } as React.FormEvent);
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const dateKey = formatMessageDate(message.createdAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const handleConfirmSchedule = async (date: string, time: string) => {
    if (!deliveryId || !salesPerson) {
      showToast('Missing required information', 'error');
      return;
    }

    try {
      await api.deliveries.update(deliveryId, {
        scheduledDate: date,
        scheduledTime: time,
        scheduleConfirmedBy: salesPerson.id,
        scheduleConfirmedAt: new Date().toISOString(),
        status: 'in_progress'
      });

      const driverUserId = driver?.userId || null;

      const confirmMessage = `Schedule confirmed! Delivery scheduled for ${new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at ${time}.`;

      if (driverUserId) {
        await api.messages.create({
          deliveryId: deliveryId,
          senderId: user!.id,
          recipientId: driverUserId,
          content: confirmMessage,
        });

        await api.notifications.create({
          userId: driverUserId,
          deliveryId: deliveryId,
          type: 'schedule_confirmed',
          title: 'Schedule Confirmed',
          message: `Delivery schedule confirmed for ${new Date(date).toLocaleDateString()} at ${time}`,
          read: false,
        });
      }

      showToast('Schedule confirmed successfully!', 'success');
      setShowScheduleModal(false);

      await loadDeliveryWithRelations();
      await loadMessages();

    } catch (error) {
      console.error('Failed to confirm schedule:', error);
      showToast('Failed to confirm schedule. Please try again.', 'error');
    }
  };

  const canConfirmSchedule = role === 'sales' && (delivery?.status === 'accepted' || delivery?.status === 'assigned') && !delivery?.scheduledDate;

  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <button
            onClick={() => navigate(-1)}
            className="touch-target flex items-center text-gray-300 hover:text-red-400 mb-3 sm:mb-4 transition"
            data-testid="button-back"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>

          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate" data-testid="text-vin">VIN: {delivery.vin}</p>
                <p className="text-xs sm:text-sm text-gray-600 break-words" data-testid="text-route">
                  {delivery.pickup} → {delivery.dropoff}
                </p>
                {delivery.requiredTimeframe && (
                  <p className="text-xs text-gray-500 mt-1">
                    <Calendar size={12} className="inline mr-1" />
                    Required: {getTimeframeDisplay(delivery.requiredTimeframe, delivery.customDate)}
                  </p>
                )}
              </div>
              <StatusBadge status={delivery.status} />
            </div>
            {delivery.scheduledDate && delivery.scheduledTime && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 mb-3">
                <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-green-900">Schedule Confirmed</p>
                  <p className="text-xs text-green-800 break-words">
                    {new Date(delivery.scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} at {delivery.scheduledTime}
                  </p>
                </div>
              </div>
            )}
            {canConfirmSchedule && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="touch-target w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                data-testid="button-confirm-schedule"
              >
                <Calendar size={18} />
                Confirm Delivery Schedule
              </button>
            )}
            {role === 'sales' && salesPerson?.dealerId && (
              <button
                onClick={() => setShowNewDeliveryModal(true)}
                className="touch-target w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base mt-2"
                data-testid="button-schedule-new-delivery"
              >
                <Calendar size={18} />
                Schedule New Delivery
              </button>
            )}
            {delivery.notes && (
              <p className="text-sm text-gray-600 mt-2">{delivery.notes}</p>
            )}
            <div className="mt-3 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowPhotos(!showPhotos)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
                data-testid="button-toggle-chat-photos"
              >
                <span className="flex items-center gap-2">
                  <Camera size={16} />
                  Delivery Photos
                </span>
                <span className="text-gray-400">{showPhotos ? '▲' : '▼'}</span>
              </button>
              {showPhotos && (
                <div className="mt-3 space-y-4">
                  {(role === 'driver' || role === 'sales') && (
                    <DeliveryPhotoUpload
                      deliveryId={deliveryId!}
                      uploaderRole={role as 'driver' | 'sales'}
                      onPhotoUploaded={() => setPhotoRefreshTrigger(prev => prev + 1)}
                    />
                  )}
                  <DeliveryPhotoGallery
                    deliveryId={deliveryId!}
                    currentUserRole={role || undefined}
                    refreshTrigger={photoRefreshTrigger}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm mt-2">Start the conversation!</p>
            </div>
          ) : (
            Object.entries(groupMessagesByDate()).map(([date, dateMessages]) => (
              <div key={date} className="space-y-3">
                <div className="flex justify-center">
                  <span className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                {dateMessages.map((message) => {
                  const isSender = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      <div
                        className={`max-w-[75%] sm:max-w-xs md:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                          isSender
                            ? 'bg-red-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isSender ? 'text-red-100' : 'text-gray-500'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 sticky bottom-0 safe-bottom">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {sendError && (
            <div className="max-w-3xl mx-auto mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Failed to send message</p>
                <p className="text-xs text-red-700 mt-1">{sendError}</p>
              </div>
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition flex items-center gap-1"
                data-testid="button-retry"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
            <input
              type="text"
              value={newMessage}
              onChange={(event) => {
                setNewMessage(event.target.value);
                setSendError(null);
              }}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent text-base"
              data-testid="input-message"
            />
            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="touch-target bg-red-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 flex items-center justify-center"
              aria-label="Send message"
              data-testid="button-send"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>

      <ScheduleConfirmationModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onConfirm={handleConfirmSchedule}
        deliveryVin={delivery.vin}
        driverName={driver?.name || ''}
        driverId={delivery.driverId ?? undefined}
        requiredTimeframe={delivery.requiredTimeframe ?? undefined}
        customDate={delivery.customDate ?? undefined}
      />

      {salesPerson?.dealerId && (
        <ScheduleDeliveryModal
          isOpen={showNewDeliveryModal}
          onClose={() => setShowNewDeliveryModal(false)}
          selectedDate={new Date().toISOString().split('T')[0]}
          dealerId={salesPerson.dealerId}
          salesId={salesPerson.id}
          defaultPickupAddress={{
            street: salesPerson.defaultPickupStreet || '',
            city: salesPerson.defaultPickupCity || '',
            state: salesPerson.defaultPickupState || '',
            zip: salesPerson.defaultPickupZip || '',
          }}
          onSuccess={() => {
            setShowNewDeliveryModal(false);
            showToast('Delivery scheduled successfully!', 'success');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
