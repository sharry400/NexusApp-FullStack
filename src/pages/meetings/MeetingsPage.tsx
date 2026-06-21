import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, Event } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, X, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface MeetingEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  allData: any;
}

export const MeetingsPage: React.FC = () => {
  const { token, user: currentUser } = useAuth() as any;
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    receiverId: '', title: '', description: '', date: '', startTime: '', endTime: ''
  });

  const [selectedEvent, setSelectedEvent] = useState<MeetingEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const fetchMeetingsAndUsers = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const meetRes = await axios.get('http://localhost:5000/api/meetings', config);
      const formattedEvents: MeetingEvent[] = meetRes.data.map((meeting: any) => {
        const startDate = new Date(`${meeting.date.split('T')[0]}T${meeting.startTime}:00`);
        const endDate = new Date(`${meeting.date.split('T')[0]}T${meeting.endTime}:00`);
        return {
          id: meeting._id,
          title: `${meeting.title} (${meeting.status})`,
          start: startDate,
          end: endDate,
          status: meeting.status,
          allData: meeting
        };
      });
      setEvents(formattedEvents);

      const currentRole = (currentUser as any)?.role || 'Investor';
      const targetRole = currentRole.toLowerCase() === 'investor' ? 'Entrepreneur' : 'Investor';
      const userRes = await axios.get(`http://localhost:5000/api/users?role=${targetRole}`, config);
      setUsers(userRes.data);

      setIsLoading(false);
    } catch (error) {
      console.error("Data fetch error:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMeetingsAndUsers();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post('http://localhost:5000/api/meetings/schedule', formData, config);
      setShowModal(false);
      setFormData({ receiverId: '', title: '', description: '', date: '', startTime: '', endTime: '' });
      fetchMeetingsAndUsers();
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const handleSelectEvent = (event: MeetingEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`http://localhost:5000/api/meetings/${selectedEvent?.id}/status`, { status: newStatus }, config);

      setShowEventModal(false);
      fetchMeetingsAndUsers();
    } catch (error) {
      console.error("Status Update Error:", error);
      alert("Something went wrong!");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Schedule</h1>
          <p className="text-gray-600">Manage your upcoming meetings and calls.</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setShowModal(true)}>
          Schedule Meeting
        </Button>
      </div>

      <Card>
        <CardBody className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-96">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div style={{ height: '70vh' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={(event: any) => {
                  let backgroundColor = '#3b82f6';
                  if (event.status === 'Accepted') backgroundColor = '#10b981';
                  if (event.status === 'Rejected') backgroundColor = '#ef4444';
                  return { style: { backgroundColor } };
                }}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Meeting Details</h2>
              <button onClick={() => setShowEventModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <CardBody className="p-4 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.allData.title}</h3>
                <p className="text-gray-500 mt-1 flex items-center gap-1">
                  <Clock size={16} />
                  {selectedEvent.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                  {selectedEvent.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="bg-gray-50 p-3 rounded-md border text-sm">
                <p><strong>Date:</strong> {selectedEvent.start.toLocaleDateString()}</p>
                <p className="mt-1">
                  <strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium
                    ${selectedEvent.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                      selectedEvent.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'}`}>
                    {selectedEvent.status}
                  </span>
                </p>
              </div>

              {selectedEvent.status === 'Pending' &&
               selectedEvent.allData.receiver?._id === (currentUser as any)?._id && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    leftIcon={<CheckCircle size={18} />}
                    onClick={() => handleUpdateStatus('Accepted')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-500 text-red-600 hover:bg-red-50"
                    leftIcon={<XCircle size={18} />}
                    onClick={() => handleUpdateStatus('Rejected')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">

          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Schedule a Meeting</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <CardBody className="p-4">
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 flex items-center rounded-md text-sm">
                  <AlertCircle size={16} className="mr-2" /> {errorMsg}
                </div>
              )}
              <form onSubmit={handleSchedule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Meet With</label>
                  <select
                    name="receiverId"
                    value={formData.receiverId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="">Select a person...</option>
                    {users.map(u => (
                      <option key={u._id || u.id} value={u._id || u.id}>
                        {u.name} ({u.profile?.startupName || u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Title</label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full p-2 border rounded-md" required placeholder="e.g. Initial Pitch Call" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full p-2 border rounded-md" required />
                  </div>
                </div>
                <Button type="submit" className="w-full mt-4">Send Invite</Button>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};