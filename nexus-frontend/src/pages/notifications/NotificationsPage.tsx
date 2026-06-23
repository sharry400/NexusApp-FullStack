import React, { useState, useEffect, useCallback } from 'react';
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar, CheckCheck, Loader } from 'lucide-react';
import { Card, CardBody } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API = 'https://nexus-app-full-stack.vercel.app';

export const NotificationsPage: React.FC = () => {
  const { token } = useAuth() as any;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/notifications`, authHeaders);
      setNotifications(res.data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setIsMarking(true);
    try {
      await axios.put(`${API}/api/notifications/mark-read`, {}, authHeaders);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark read error:', err);
    } finally {
      setIsMarking(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meeting_request':
        return <Calendar size={16} className="text-blue-600" />;
      case 'meeting_accepted':
        return <CheckCheck size={16} className="text-green-600" />;
      case 'meeting_rejected':
        return <Calendar size={16} className="text-red-600" />;
      case 'new_message':
        return <MessageCircle size={16} className="text-primary-600" />;
      case 'connection':
        return <UserPlus size={16} className="text-secondary-600" />;
      case 'investment':
        return <DollarSign size={16} className="text-accent-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'meeting_request': return 'bg-blue-50';
      case 'meeting_accepted': return 'bg-green-50';
      case 'meeting_rejected': return 'bg-red-50';
      default: return 'bg-primary-50';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with your network activity
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                {unreadCount} new
              </span>
            )}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            isLoading={isMarking}
            leftIcon={<CheckCheck size={16} />}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader size={32} className="animate-spin text-primary-600" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-16">
            <Bell size={48} className="text-gray-300 mb-4" />
            <h3 className="text-gray-500 font-medium">No notifications yet</h3>
            <p className="text-gray-400 text-sm mt-1">
              You'll see meeting requests and updates here
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card
              key={notification._id}
              className={`transition-all duration-200 border ${
                !notification.isRead
                  ? `${getNotificationBg(notification.type)} border-primary-100`
                  : 'bg-white border-gray-100'
              }`}
            >
              <CardBody className="flex items-start p-4">
                <div className="relative flex-shrink-0 mr-4">
                  <Avatar
                    src={notification.sender?.avatarUrl || ''}
                    alt={notification.sender?.name || 'System'}
                    size="md"
                  />
                  <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm border">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {notification.sender?.name || 'System'}
                    </span>
                    {!notification.isRead && (
                      <Badge variant="primary" size="sm" rounded>New</Badge>
                    )}
                  </div>

                  <p className="text-gray-600 mt-1 text-sm">{notification.message}</p>

                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};