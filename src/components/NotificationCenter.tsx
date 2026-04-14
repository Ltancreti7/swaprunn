import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Truck, MessageCircle, X, UserCheck, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { formatDistanceToNow } from "../lib/dateUtils";
import api from "../lib/api";
import type { Notification } from "../../shared/schema";

const POLLING_INTERVAL = 15000;

interface AdminInvitation {
  id: string;
  token: string;
  role: string;
  expiresAt: string;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState<AdminInvitation[]>([]);
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const data = await api.notifications.list();
      const notifs = (data || []).slice(0, 10);
      setNotifications(notifs);

      const unreadNotifications = notifs.filter((n: Notification) => !n.read).length;
      const pendingInvitationsCount = pendingInvitations.length;
      setUnreadCount(unreadNotifications + pendingInvitationsCount);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [user, pendingInvitations.length]);

  useEffect(() => {
    if (!user) return;

    loadNotifications();

    pollingRef.current = setInterval(loadNotifications, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [user, loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.notifications.markRead(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => api.notifications.markRead(n.id)));
      loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    setAcceptingInvitation(token);
    try {
      showToast('Invitation accepted! Redirecting to dealer dashboard...', 'success');
      setPendingInvitations(prev => prev.filter(inv => inv.token !== token));
      loadNotifications();
      setTimeout(() => {
        navigate('/dealer');
        setIsOpen(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      showToast(message, 'error');
      console.error('Exception accepting invitation:', err);
    } finally {
      setAcceptingInvitation(null);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    switch (notification.type) {
      case "new_driver_application":
        navigate("/dealer?tab=applications");
        setIsOpen(false);
        break;

      case "new_delivery_available":
      case "delivery_reminder":
        navigate("/driver");
        setIsOpen(false);
        break;

      case "application_approved":
      case "application_rejected":
      case "application_followup":
        navigate("/driver");
        setIsOpen(false);
        break;

      case "admin_invitation":
      case "admin_role_granted":
        navigate("/dealer");
        setIsOpen(false);
        break;

      case "delivery_assigned":
      case "delivery_accepted":
      case "status_update":
        if (notification.deliveryId) {
          navigate(`/chat/${notification.deliveryId}`);
          setIsOpen(false);
        }
        break;

      case "new_message":
        if (notification.deliveryId) {
          navigate(`/chat/${notification.deliveryId}`);
          setIsOpen(false);
        }
        break;

      default:
        if (notification.deliveryId) {
          navigate(`/chat/${notification.deliveryId}`);
          setIsOpen(false);
        }
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "delivery_assigned":
      case "delivery_accepted":
        return <Truck size={20} className="text-rose-600" />;
      case "status_update":
        return <Truck size={20} className="text-gray-700" />;
      case "new_delivery_available":
      case "delivery_reminder":
        return <Truck size={20} className="text-red-600" />;
      case "new_message":
        return <MessageCircle size={20} className="text-red-600" />;
      case "new_driver_application":
        return <UserCheck size={20} className="text-red-600" />;
      case "application_approved":
        return <UserCheck size={20} className="text-gray-700" />;
      case "application_rejected":
        return <UserCheck size={20} className="text-red-700" />;
      case "application_followup":
        return <MessageCircle size={20} className="text-rose-600" />;
      case "admin_invitation":
      case "admin_role_granted":
        return <Shield size={20} className="text-red-600" />;
      default:
        return <Bell size={20} className="text-gray-700" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-black transition"
        data-testid="button-notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed md:absolute right-0 md:right-0 left-0 md:left-auto top-16 md:top-auto md:mt-2 w-full md:w-96 max-w-[calc(100vw-1rem)] md:max-w-96 bg-white rounded-lg md:rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[32rem] overflow-hidden flex flex-col mx-2 md:mx-0">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                    data-testid="button-mark-all-read"
                  >
                    <Check size={16} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  data-testid="button-close-notifications"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {pendingInvitations.length > 0 && (
                <div className="bg-red-50 border-b-2 border-red-200">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={20} className="text-red-600" />
                      <h4 className="font-semibold text-red-900">Admin Invitations</h4>
                    </div>
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className="bg-white rounded-lg p-3 border border-red-200">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            You've been invited as a {invitation.role}
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvitation(invitation.token);
                            }}
                            disabled={acceptingInvitation === invitation.token}
                            className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {acceptingInvitation === invitation.token ? 'Accepting...' : 'Accept Invitation'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {notification.createdAt && formatDistanceToNow(notification.createdAt.toString())}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
