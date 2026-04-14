import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Package, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatTime } from '../lib/dateUtils';
import { StatusBadge } from '../components/ui/Badge';
import { UnreadBadge } from '../components/ui/UnreadBadge';
import api from '../lib/api';
import type { Delivery, Message } from '../../shared/schema';

const POLLING_INTERVAL = 10000;

interface ConversationGroup {
  deliveryId: string;
  delivery: Delivery;
  lastMessage: Message;
  unreadCount: number;
  otherPartyName: string;
}

export function AllConversations() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    pollingRef.current = setInterval(() => {
      loadConversations();
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      const data = await api.conversations.list();

      if (!data || data.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationGroups: ConversationGroup[] = await Promise.all(
        data.map(async (conv: { deliveryId: string; delivery: Delivery; lastMessage: Message; unreadCount: number }) => {
          let otherPartyName = 'Unknown';

          if (role === 'driver' && conv.delivery.salesId) {
            try {
              const salesData = await api.sales.get(conv.delivery.salesId);
              otherPartyName = salesData?.name || 'Sales Person';
            } catch {
              otherPartyName = 'Sales Person';
            }
          } else if (role === 'sales' && conv.delivery.driverId) {
            try {
              const driverData = await api.drivers.get(conv.delivery.driverId);
              otherPartyName = driverData?.name || 'Driver';
            } catch {
              otherPartyName = 'Driver';
            }
          }

          return {
            deliveryId: conv.deliveryId,
            delivery: conv.delivery,
            lastMessage: conv.lastMessage,
            unreadCount: conv.unreadCount,
            otherPartyName,
          };
        })
      );

      const sortedConversations = conversationGroups.sort(
        (a, b) => new Date(b.lastMessage.createdAt || '').getTime() - new Date(a.lastMessage.createdAt || '').getTime()
      );

      setConversations(sortedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (deliveryId: string) => {
    navigate(`/chat/${deliveryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="touch-target flex items-center text-gray-300 hover:text-red-400 mb-3 transition"
            data-testid="button-back"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <MessageCircle size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">All Conversations</h1>
              <p className="text-sm text-gray-300">
                {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MessageCircle size={64} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Conversations Yet</h2>
            <p className="text-gray-600">
              {role === 'driver'
                ? 'Accept a delivery request to start chatting with the sales team.'
                : 'Assign a driver to a delivery to start a conversation.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <button
                key={conversation.deliveryId}
                onClick={() => handleConversationClick(conversation.deliveryId)}
                className="w-full bg-white rounded-lg shadow-sm hover:shadow-md transition-all p-4 text-left border-2 border-transparent hover:border-red-200"
                data-testid={`conversation-${conversation.deliveryId}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-2.5 rounded-lg flex-shrink-0">
                      <Package size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.otherPartyName}
                        </h3>
                        {conversation.unreadCount > 0 && (
                          <UnreadBadge count={conversation.unreadCount} />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        VIN: {conversation.delivery.vin}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={conversation.delivery.status} />
                </div>

                <div className="flex items-start gap-2 mb-3 text-sm text-gray-600">
                  <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                  <p className="flex-1 truncate">
                    {conversation.delivery.pickupCity || conversation.delivery.pickup}
                    {' → '}
                    {conversation.delivery.dropoffCity || conversation.delivery.dropoff}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium text-gray-500">Latest Message</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {formatTime(conversation.lastMessage.createdAt)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {conversation.lastMessage.senderId === user?.id ? 'You: ' : ''}
                    {conversation.lastMessage.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
