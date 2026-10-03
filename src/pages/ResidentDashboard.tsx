import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/ui/button';
import ComplaintForm from '../components/layout/ComplaintForm';
import ProfileEditModal from '../components/layout/ProfileEditModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Megaphone, 
  ChevronRight, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Info,
  ArrowUp,
  LogOut,
  Plus
} from 'lucide-react';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'submitted' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  house_number: string;
  block: string;
  floor: number;
  image_url: string | null;
  resolution_image_url: string | null;
  contact_number: string;
  admin_name: string | null;
  assigned_admin_id: string | null;
  re_raised_count: number;
  last_status_change_at: string;
  created_at: string;
  updated_at: string;
}

interface StatusLog {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string;
  changed_by_role: string;
  comment: string | null;
  created_at: string;
}

interface Notification {
  id: string;
  complaint_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  author_name: string;
  created_at: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export const ResidentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  // State variables
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedComplaintLogs, setSelectedComplaintLogs] = useState<StatusLog[]>([]);
  
  // UI control states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reRaiseError, setReRaiseError] = useState<string | null>(null);
  const [reRaiseSuccess, setReRaiseSuccess] = useState<string | null>(null);

  // Load dashboard items
  const loadData = async () => {
    try {
      setIsLoading(true);
      const complaintsRes = await api.get<{ complaints: Complaint[] }>('/complaints');
      setComplaints(complaintsRes.complaints);

      const announcementsRes = await api.get<{ announcements: Announcement[] }>('/announcements');
      setAnnouncements(announcementsRes.announcements);

      const notificationsRes = await api.get<{ notifications: Notification[] }>('/notifications');
      setNotifications(notificationsRes.notifications);
    } catch (error) {
      console.error('[ResidentDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads specific audit history and refreshes detail card
   */
  const handleSelectComplaint = async (complaint: Complaint) => {
    setReRaiseError(null);
    setReRaiseSuccess(null);
    try {
      const res = await api.get<{ complaint: Complaint; logs: StatusLog[] }>(`/complaints/${complaint.id}`);
      setSelectedComplaint(res.complaint);
      setSelectedComplaintLogs(res.logs);
    } catch (err) {
      console.error('[ResidentDashboard] Failed to load complaint detail:', err);
    }
  };

  /**
   * Re-raises inactive complaints (>5 days)
   */
  const handleReRaise = async (id: string) => {
    setReRaiseError(null);
    setReRaiseSuccess(null);
    try {
      const res = await api.post<{ message: string; complaint: Complaint }>(`/complaints/${id}/re-raise`, {});
      setReRaiseSuccess(res.message);
      
      // Refresh state
      if (selectedComplaint && selectedComplaint.id === id) {
        handleSelectComplaint(res.complaint);
      }
      
      // Reload lists
      const complaintsRes = await api.get<{ complaints: Complaint[] }>('/complaints');
      setComplaints(complaintsRes.complaints);
    } catch (err: any) {
      setReRaiseError(err.message || 'Failed to re-raise complaint.');
    }
  };

  /**
   * Reads notification
   */
  const handleReadNotification = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`, {});
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('[ResidentDashboard] Error marking notification read:', error);
    }
  };

  /**
   * Reads all notifications
   */
  const handleReadAllNotifications = async () => {
    try {
      await api.put('/notifications/read-all', {});
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('[ResidentDashboard] Error marking all notifications read:', error);
    }
  };

  // Helper status color styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
      case 'verified': return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'assigned': return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
      case 'in_progress': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
      case 'resolved': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      case 'closed': return 'bg-slate-800 text-slate-400 border-slate-700/50';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Helper priority color styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-slate-800/40 text-slate-300';
      case 'medium': return 'bg-blue-950/20 text-blue-400 border-blue-950/40';
      case 'high': return 'bg-amber-950/20 text-amber-450 border-amber-950/40';
      case 'emergency': return 'bg-red-950/30 text-red-400 border-red-950/50 animate-pulse';
      default: return 'bg-slate-50 text-slate-700';
    }
  };

  const unreadNotifs = notifications.filter(n => !n.is_read);

  // Split active list from history resolved/closed items
  const filteredComplaints = complaints.filter(c => {
    if (activeTab === 'active') {
      return c.status !== 'resolved' && c.status !== 'closed';
    } else {
      return c.status === 'resolved' || c.status === 'closed';
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Navigation Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
            M
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white font-sans tracking-tight">MyArea Connect</h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Resident Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Dropdown Bell */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-350 hover:text-white rounded-full border border-slate-750 transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-slate-900" />
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 shadow-2xl rounded-xl overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-850">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={handleReadAllNotifications}
                        className="text-[11px] text-primary hover:text-primary-foreground hover:underline font-semibold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        No notifications found.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleReadNotification(notif.id)}
                          className={`p-4 transition-colors cursor-pointer text-xs ${
                            notif.is_read ? 'hover:bg-slate-850/40' : 'bg-primary/5 hover:bg-primary/10'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className={`font-semibold ${notif.is_read ? 'text-slate-300' : 'text-primary-foreground'}`}>
                              {notif.title}
                            </p>
                            <span className="text-[9px] text-slate-500 font-mono shrink-0">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-[10px] text-primary hover:text-indigo-400 font-bold uppercase tracking-wider hover:underline cursor-pointer"
            >
              Block {user?.block} • Apt {user?.house_number} (Edit Profile)
            </button>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg border border-slate-750 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout grid */}
      <main className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Left Column: Announcements and Complaints list */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Welcome Banner Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg flex items-center justify-between flex-wrap gap-4"
          >
            <div>
              <h2 className="text-2xl font-bold text-white">Welcome back, {user?.name}!</h2>
              <p className="text-slate-400 text-sm mt-1">
                Report maintaining faults, utility disruptions, or security issues directly.
              </p>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white font-semibold">
              <Plus className="w-4 h-4" />
              Raise Complaint
            </Button>
          </motion.div>

          {/* List and Tabs Container */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-lg overflow-hidden">
            
            {/* List Header Tabs */}
            <div className="border-b border-slate-850 px-6 py-4 flex items-center justify-between bg-slate-900/40">
              <h3 className="font-bold text-white uppercase tracking-wider text-xs">My Filed Issues</h3>
              <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === 'active'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active ({complaints.filter(c => c.status !== 'resolved' && c.status !== 'closed').length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  History ({complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length})
                </button>
              </div>
            </div>

            {/* Complaints list */}
            <div className="divide-y divide-slate-850">
              {isLoading ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-3"></div>
                  Loading complaints list...
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="p-16 text-center text-xs text-slate-500 font-medium">
                  No {activeTab} complaints found in your dashboard.
                </div>
              ) : (
                <motion.div 
                  layout
                  className="divide-y divide-slate-850"
                >
                  <AnimatePresence>
                    {filteredComplaints.map((complaint) => (
                      <motion.div
                        key={complaint.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => handleSelectComplaint(complaint)}
                        className={`p-6 flex items-center justify-between hover:bg-slate-850/20 transition-all cursor-pointer ${
                          selectedComplaint?.id === complaint.id ? 'bg-slate-850/40 border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className="space-y-1.5 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {complaint.id}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusColor(complaint.status)}`}>
                              {complaint.status.replace('_', ' ')}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${getPriorityColor(complaint.priority)}`}>
                              {complaint.priority}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white leading-snug">
                            {complaint.title}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {complaint.description}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Category: <strong className="text-slate-400">{complaint.category_name}</strong> • Created: {new Date(complaint.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed View Sidebar or Announcement Bulletin */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              /* Selected Complaint Detail side-panel */
              <motion.div 
                key="detail-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-6 bg-slate-905 border border-slate-800/80 rounded-xl shadow-lg space-y-6 relative"
              >
                {/* Detail Header */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500">{selectedComplaint.id}</span>
                    <h3 className="text-base font-bold text-white mt-1 leading-snug">{selectedComplaint.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Status and Priority badges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-center">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Status</p>
                    <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-center">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Priority</p>
                    <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${getPriorityColor(selectedComplaint.priority)}`}>
                      {selectedComplaint.priority}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Description
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Image attachment */}
                {selectedComplaint.image_url && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference Attachment</h4>
                    <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                      <img
                        src={selectedComplaint.image_url.startsWith('http') ? selectedComplaint.image_url : `${BACKEND_URL}${selectedComplaint.image_url}`}
                        alt="Fault reference"
                        className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Resolution Image proof attachment */}
                {selectedComplaint.resolution_image_url && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Resolution Proof Attachment</h4>
                    <div className="border border-emerald-950/20 rounded-lg overflow-hidden bg-slate-950">
                      <img
                        src={selectedComplaint.resolution_image_url.startsWith('http') ? selectedComplaint.resolution_image_url : `${BACKEND_URL}${selectedComplaint.resolution_image_url}`}
                        alt="Resolution proof"
                        className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Metadata Details */}
                <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Location: Block {selectedComplaint.block} • Flat {selectedComplaint.house_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contact: {selectedComplaint.contact_number}</span>
                  </div>
                  {selectedComplaint.admin_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Assigned to: <strong className="text-white">{selectedComplaint.admin_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Escalation Re-Raise Component */}
                {selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'closed' && (
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 p-3 rounded-lg">
                      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        If this complaint remains unaddressed for **5 days**, you can escalate it to the next priority level.
                      </p>
                    </div>

                    {reRaiseError && (
                      <div className="p-2.5 bg-red-950/40 border border-red-900/50 text-red-400 text-xs rounded-md">
                        {reRaiseError}
                      </div>
                    )}

                    {reRaiseSuccess && (
                      <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs rounded-md">
                        {reRaiseSuccess}
                      </div>
                    )}

                    <Button 
                      type="button" 
                      variant="outline"
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-850"
                      onClick={() => handleReRaise(selectedComplaint.id)}
                    >
                      <ArrowUp className="w-4 h-4" />
                      Re-Raise Complaint {selectedComplaint.re_raised_count > 0 && `(${selectedComplaint.re_raised_count})`}
                    </Button>
                  </div>
                )}

                {/* Status Audit Log list */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Log History</h4>
                  <div className="relative border-l border-slate-800 ml-2 pl-4 space-y-4 text-[11px] py-1">
                    {selectedComplaintLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-slate-800 ring-4 ring-slate-900" />
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-300">
                            {log.changed_by_name} ({log.changed_by_role})
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-400 mt-0.5 leading-relaxed">{log.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              /* Announcement bulletin board */
              <motion.div 
                key="notices-panel"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-6 bg-slate-909 border border-slate-800/80 rounded-xl shadow-lg space-y-4"
              >
                <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Megaphone className="w-4 h-4 text-primary" />
                  Community Notices
                </h3>

                <div className="space-y-4 divide-y divide-slate-800/60 max-h-[70vh] overflow-y-auto pr-1">
                  {announcements.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 font-medium">No active notice board bulletins.</p>
                  ) : (
                    announcements.map((notice) => (
                      <div key={notice.id} className="pt-3 first:pt-0">
                        <div className="flex justify-between items-start text-[10px] text-slate-500 font-mono">
                          <span className="font-semibold text-slate-450">{notice.author_name}</span>
                          <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-200 mt-1">{notice.title}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap font-sans">{notice.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal: Complaint Creation form wizard */}
      {isFormOpen && (
        <ComplaintForm
          defaultBlock={user?.block || ''}
          defaultHouse={user?.house_number || ''}
          defaultFloor={user?.floor || undefined}
          defaultPhone={user?.phone || ''}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            loadData(); // Reload complaints list
          }}
        />
      )}

      {/* Modal: Profile Editing Form */}
      {isProfileOpen && (
        <ProfileEditModal onClose={() => setIsProfileOpen(false)} />
      )}

    </div>
  );
};

export default ResidentDashboard;
