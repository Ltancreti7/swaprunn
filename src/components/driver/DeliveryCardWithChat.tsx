import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { UnreadBadge } from '../ui/UnreadBadge';

interface DeliveryCardWithChatProps {
  deliveryId: string;
  buttonLabel?: string;
  buttonClass?: string;
}

export function DeliveryCardWithChat({
  deliveryId,
  buttonLabel = 'Chat',
  buttonClass = 'px-4 py-3 text-red-600 border-2 border-red-600 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center',
}: DeliveryCardWithChatProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unreadCount = useUnreadMessages(deliveryId, user?.id);

  return (
    <button
      onClick={() => navigate(`/chat/${deliveryId}`)}
      className={`${buttonClass} relative`}
    >
      <MessageCircle size={18} className="mr-2" />
      {buttonLabel}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2">
          <UnreadBadge count={unreadCount} />
        </div>
      )}
    </button>
  );
}
