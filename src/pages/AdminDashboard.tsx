import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/ui/button';
import ProfileEditModal from '../components/layout/ProfileEditModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Megaphone, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search, 
  ChevronRight, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  SlidersHorizontal,
  Plus,
  Home,
  Layers,
  LogOut
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
  resident_name: string;
  resident_email: string;
  admin_name: string | null;
  assigned_admin_id: string | null;
  re_raised_count: number;
  created_at: string;
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

interface AdminUser {
  id: string;
  name: string;
  email: string;
}

interface Category {
  id: string;
  name: string;
}

interface PreRegisteredMember {
  id: string;
  email: string;
  name: string;
  residential_name: string;
  house_number: string;
  block: string;
  is_registered: number;
  created_at: string;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  // Data states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [preRegisteredMembers, setPreRegisteredMembers] = useState<PreRegisteredMember[]>([]);
  const [registeredResidentCount, setRegisteredResidentCount] = useState<number>(0);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedComplaintLogs, setSelectedComplaintLogs] = useState<StatusLog[]>([]);

  // Search & Filter state values
  const [searchQuery, setSearchQuery] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dashboardTab, setDashboardTab] = useState<'complaints' | 'members'>('complaints');

  // Form states
  const [newStatus, setNewStatus] = useState<string>('');
  const [newAssignee, setNewAssignee] = useState<string>('');
  const [statusComment, setStatusComment] = useState<string>('');
  const [resolutionImage, setResolutionImage] = useState<File | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  // Register Member Modal Form state
  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberBlock, setMemberBlock] = useState('');
  const [memberFloor, setMemberFloor] = useState('');
  const [memberHouse, setMemberHouse] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberSuccess, setMemberSuccess] = useState<string | null>(null);

  // Lightbox Image View State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // UI Control states
  const [isNoticePosting, setIsNoticePosting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [noticeSuccess, setNoticeSuccess] = useState<string | null>(null);

  // Load Admin Dashboard data items
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Build search parameters
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (categoryFilter) params.append('categoryId', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (blockFilter) params.append('block', blockFilter);
      if (roomFilter) params.append('houseNumber', roomFilter);

      const complaintsRes = await api.get<{ complaints: Complaint[] }>(`/complaints?${params.toString()}`);
      setComplaints(complaintsRes.complaints);
    } catch (error) {
      console.error('[AdminDashboard] Failed to fetch complaints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run on filter changes
  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, priorityFilter, categoryFilter, searchQuery, blockFilter, roomFilter]);

  // Load pre-registered members list & resident count
  const loadPreRegisteredMembers = async () => {
    try {
      const res = await api.get<{ members: PreRegisteredMember[]; residentCount?: number }>('/auth/pre-registered-members');
      setPreRegisteredMembers(res.members);
      setRegisteredResidentCount(res.residentCount || res.members.length);
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch pre-registered members:', err);
    }
  };

  // Load auxiliary lists on mount
  useEffect(() => {
    const loadAuxiliaryData = async () => {
      try {
        const categoriesRes = await api.get<{ categories: Category[] }>('/categories');
        setCategories(categoriesRes.categories);

        const adminsRes = await api.get<{ admins: AdminUser[] }>('/auth/admins');
        setAdminsList(adminsRes.admins);

        await loadPreRegisteredMembers();
      } catch (err) {
        console.error('[AdminDashboard] Failed to load categories/admins lists:', err);
      }
    };
    loadAuxiliaryData();
  }, []);

  /**
   * Submit new resident member account registration
   */
  const handleRegisterMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError(null);
    setMemberSuccess(null);

    if (!memberEmail || !memberPassword || !memberName || !memberPhone || !memberBlock || !memberHouse || memberFloor === '') {
      setMemberError('All details are required: Email, Password, Resident Name, Phone Number, Block, Floor, and House/Flat Number.');
      return;
    }

    try {
      setIsSubmittingMember(true);
      const res = await api.post<{ message: string; user: any }>('/auth/register-member', {
        email: memberEmail,
        password: memberPassword,
        name: memberName,
        phone: memberPhone,
        block: memberBlock,
        floor: memberFloor,
        houseNumber: memberHouse,
        residentialName: user?.residential_name
      });

      setMemberSuccess(res.message);
      setMemberEmail('');
      setMemberPassword('');
      setMemberName('');
      setMemberPhone('');
      setMemberBlock('');
      setMemberFloor('');
      setMemberHouse('');
      
      // Reload members queue and metric count
      await loadPreRegisteredMembers();
    } catch (err: any) {
      setMemberError(err.message || 'Failed to register resident member account.');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  /**
   * Load complaint details
   */
  const handleSelectComplaint = async (complaint: Complaint) => {
    setUpdateError(null);
    setResolutionImage(null);
    try {
      const res = await api.get<{ complaint: Complaint; logs: StatusLog[] }>(`/complaints/${complaint.id}`);
      setSelectedComplaint(res.complaint);
      setSelectedComplaintLogs(res.logs);
      
      // Initialize inputs with current values
      setNewStatus(res.complaint.status);
      setNewAssignee(res.complaint.assigned_admin_id || '');
      setStatusComment('');
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch detail logs:', err);
    }
  };

  /**
   * Post a notice
   */
  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoticeSuccess(null);
    if (!noticeTitle || !noticeContent) return;

    try {
      setIsNoticePosting(true);
      await api.post('/announcements', { title: noticeTitle, content: noticeContent });
      setNoticeTitle('');
      setNoticeContent('');
      setNoticeSuccess('Notice published successfully!');
    } catch (err: any) {
      console.error('[AdminDashboard] Failed to post notice:', err);
    } finally {
      setIsNoticePosting(false);
    }
  };

  /**
   * Submit Status & Assignment update
   */
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setUpdateError(null);

    try {
      setIsUpdatingStatus(true);
      
      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('assignedAdminId', newAssignee);
      formData.append('comment', statusComment);
      if (newStatus === 'resolved' && resolutionImage) {
        formData.append('image', resolutionImage);
      }

      const res = await api.putFormData<{ complaint: Complaint }>(`/complaints/${selectedComplaint.id}/status`, formData);

      // Refresh Detail Panel
      await handleSelectComplaint(res.complaint);

      // Refresh Complaints Queue
      loadDashboardData();
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update complaint status.');
    } finally {
      setIsUpdatingStatus(false);
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
      case 'closed': return 'bg-slate-800 text-slate-455 border-slate-700/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper priority color styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-slate-800/40 text-slate-300';
      case 'medium': return 'bg-blue-950/20 text-blue-400 border-blue-950/40';
      case 'high': return 'bg-amber-950/20 text-amber-450 border-amber-950/40';
      case 'emergency': return 'bg-red-950/30 text-red-400 border-red-950/50 animate-pulse';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  // Metric aggregates
  const totalCount = complaints.length;
  const pendingCount = complaints.filter(c => c.status === 'submitted').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress' || c.status === 'assigned').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Navigation Header */}
      <header className="border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-md">
            A
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">MyArea Connect</h1>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Admin Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              setIsRegisterMemberOpen(true);
              setMemberError(null);
              setMemberSuccess(null);
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg border-0 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Register New Member
          </Button>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-tight">{user?.name}</p>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-[10px] text-emerald-400 hover:text-indigo-400 font-bold uppercase tracking-wider hover:underline cursor-pointer"
            >
              {user?.residential_name ? `${user.residential_name} Authority` : 'Residential Authority'} (Edit Profile)
            </button>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-350 hover:text-white text-xs font-semibold rounded-lg border border-slate-750 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="p-6 max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider">Total Complaints</p>
            <p className="text-2xl font-extrabold text-white mt-1.5">{totalCount}</p>
          </div>
          <div className="p-5 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Registered Residents
            </p>
            <p className="text-2xl font-extrabold text-white mt-1.5">{registeredResidentCount}</p>
          </div>
          <div className="p-5 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              New Submissions
            </p>
            <p className="text-2xl font-extrabold text-white mt-1.5">{pendingCount}</p>
          </div>
          <div className="p-5 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Active Actions
            </p>
            <p className="text-2xl font-extrabold text-white mt-1.5">{inProgressCount}</p>
          </div>
          <div className="p-5 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg">
            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Completed Resolved
            </p>
            <p className="text-2xl font-extrabold text-white mt-1.5">{resolvedCount}</p>
          </div>
        </div>

        {/* Dashboard workspace grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Complaints queue table list */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter Panel */}
            <div className="p-6 bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg space-y-4">
              <h3 className="font-bold text-white uppercase tracking-wider text-xs flex items-center gap-2 border-b border-slate-800 pb-3">
                <SlidersHorizontal className="w-4 h-4 text-slate-450" />
                Filter & Search Queue
              </h3>

              {/* Symmetric Double-Row Filter Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                {/* Row 1: Generic Search, Block, Room */}
                <div className="relative sm:col-span-3">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search title, details, resident, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-9"
                  />
                </div>

                <div className="relative sm:col-span-1.5">
                  <Layers className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Block"
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-9"
                  />
                </div>

                <div className="relative sm:col-span-1.5">
                  <Home className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Room/Flat"
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-9"
                  />
                </div>

                {/* Row 2: Category, Status, Priority */}
                <div className="sm:col-span-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer h-9"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer h-9"
                  >
                    <option value="">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="verified">Verified</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-800 rounded-lg bg-slate-950/50 text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer h-9"
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Complaints list queue */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-xl border border-slate-800 shadow-lg overflow-hidden animate-none">
              <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDashboardTab('complaints')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTab === 'complaints'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-800/60'
                    }`}
                  >
                    Complaints Queue ({complaints.length})
                  </button>
                  <button
                    onClick={() => setDashboardTab('members')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      dashboardTab === 'members'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-800/60'
                    }`}
                  >
                    Pre-Registered Residents ({preRegisteredMembers.length})
                  </button>
                </div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {dashboardTab === 'complaints' ? `${complaints.length} Issues` : `${preRegisteredMembers.length} Members`}
                </span>
              </div>

              {dashboardTab === 'members' ? (
                /* Pre-Registered Members Table View */
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-400">
                      Residents authorized by {user?.residential_name || 'Authority'} to register accounts:
                    </p>
                    <Button
                      onClick={() => setIsRegisterMemberOpen(true)}
                      className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      + Add New Resident
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3">Resident Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Block / Unit</th>
                          <th className="p-3">Account Status</th>
                          <th className="p-3">Date Authorized</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {preRegisteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">
                              No pre-registered members found. Click "Add New Resident" to pre-authorize resident emails.
                            </td>
                          </tr>
                        ) : (
                          preRegisteredMembers.map((m) => (
                            <tr key={m.id} className="hover:bg-slate-850/40">
                              <td className="p-3 font-semibold text-white">{m.name}</td>
                              <td className="p-3 font-mono text-slate-300">{m.email}</td>
                              <td className="p-3">Block {m.block} - Flat {m.house_number}</td>
                              <td className="p-3">
                                {m.is_registered ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Registered Active
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Pending Registration
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-slate-500">{new Date(m.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Complaints Queue List View */
                <div className="divide-y divide-slate-850">
                  {isLoading ? (
                    <div className="p-12 text-center text-xs text-slate-400">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto mb-3"></div>
                      Loading complaints...
                    </div>
                  ) : complaints.length === 0 ? (
                    <div className="p-16 text-center text-xs text-slate-500 font-medium">
                      No matching complaints found in the queue.
                    </div>
                  ) : (
                    <motion.div 
                      layout
                      className="divide-y divide-slate-850"
                    >
                    <AnimatePresence>
                      {complaints.map((c) => (
                        <motion.div
                          key={c.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => handleSelectComplaint(c)}
                          className={`p-6 flex items-center justify-between hover:bg-slate-850/20 transition-all cursor-pointer ${
                            selectedComplaint?.id === c.id ? 'bg-slate-850/40 border-l-2 border-emerald-400' : ''
                          }`}
                        >
                          <div className="space-y-1.5 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono text-slate-450 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                {c.id}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getStatusColor(c.status)}`}>
                                {c.status.replace('_', ' ')}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${getPriorityColor(c.priority)}`}>
                                {c.priority}
                              </span>
                              {c.re_raised_count > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-950/40 text-red-400 border border-red-950/50 animate-pulse">
                                  Re-Raised ({c.re_raised_count})
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white leading-snug">
                              {c.title}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {c.description}
                            </p>
                            <div className="text-[11px] text-slate-400 font-medium flex items-center gap-2 flex-wrap pt-1">
                              <span>Resident: <strong className="text-slate-200 font-semibold">{c.resident_name}</strong></span>
                              <span>• Block: <strong className="text-slate-200 font-semibold">{c.block}</strong></span>
                              <span>• Floor: <strong className="text-slate-200 font-semibold">{c.floor !== undefined && c.floor !== null ? c.floor : 'N/A'}</strong></span>
                              <span>• Flat: <strong className="text-slate-200 font-semibold">{c.house_number}</strong></span>
                              <span>• Contact: <strong className="text-slate-200 font-semibold">{c.contact_number || (c as any).resident_phone || 'N/A'}</strong></span>
                            </div>

                            {c.image_url && (
                              <div className="mt-2 flex items-center gap-2 pt-1">
                                <img
                                  src={c.image_url.startsWith('http') ? c.image_url : `${BACKEND_URL}${c.image_url}`}
                                  alt="Attached complaint fault reference"
                                  className="w-12 h-12 object-cover rounded-lg border border-slate-700 hover:scale-105 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxUrl(c.image_url!.startsWith('http') ? c.image_url! : `${BACKEND_URL}${c.image_url!}`);
                                  }}
                                />
                                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
                                  🖼️ Image Received (Click to Expand)
                                </span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
              )}
            </div>

          </div>

          {/* Right Column: Selected Complaint Detail panel or notices poster */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {selectedComplaint ? (
                /* Selected Complaint details side-panel */
                <motion.div 
                  key="admin-detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-6 bg-slate-905 border border-slate-800 rounded-xl shadow-lg space-y-6 relative"
                >
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-slate-550">{selectedComplaint.id}</span>
                      <h3 className="text-base font-bold text-white mt-1 leading-snug">{selectedComplaint.title}</h3>
                    </div>
                    <button
                      onClick={() => setSelectedComplaint(null)}
                      className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Description details */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      Resident Description
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Image attachment */}
                  {selectedComplaint.image_url && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Reference Attachment</h4>
                      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                        <a 
                          href={selectedComplaint.image_url.startsWith('http') ? selectedComplaint.image_url : `${BACKEND_URL}${selectedComplaint.image_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <img
                            src={selectedComplaint.image_url.startsWith('http') ? selectedComplaint.image_url : `${BACKEND_URL}${selectedComplaint.image_url}`}
                            alt="Fault visual reference"
                            className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Resolution Image proof attachment */}
                  {selectedComplaint.resolution_image_url && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Resolution Proof Attachment</h4>
                      <div className="border border-emerald-950/30 rounded-lg overflow-hidden bg-slate-950">
                        <a 
                          href={selectedComplaint.resolution_image_url.startsWith('http') ? selectedComplaint.resolution_image_url : `${BACKEND_URL}${selectedComplaint.resolution_image_url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <img
                            src={selectedComplaint.resolution_image_url.startsWith('http') ? selectedComplaint.resolution_image_url : `${BACKEND_URL}${selectedComplaint.resolution_image_url}`}
                            alt="Resolution proof visual reference"
                            className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Location Metadata */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/80 space-y-2.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Location: Block {selectedComplaint.block} • Flat {selectedComplaint.house_number} (Floor {selectedComplaint.floor || 'N/A'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Contact Phone: {selectedComplaint.contact_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Resident: {selectedComplaint.resident_name} ({selectedComplaint.resident_email})</span>
                    </div>
                  </div>

                  {/* UPDATE STATUS & ASSIGNMENT FORM */}
                  <form onSubmit={handleUpdateStatus} className="border-t border-slate-800 pt-4 space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Update Action Panel</h4>
                                 {updateError && (
                      <div className="p-2.5 bg-red-950/40 border border-red-900/50 text-red-400 text-xs rounded-lg font-semibold">
                        {updateError}
                      </div>
                    )}

                    {/* Status Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Update Status</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer h-10"
                      >
                        <option value="submitted">Submitted</option>
                        <option value="verified">Verified</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    {/* Resolution Image Upload (shown only when status is resolved) */}
                    {newStatus === 'resolved' && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          Upload Resolution Image (Proof)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              setResolutionImage(e.target.files[0]);
                            }
                          }}
                          className="w-full p-2 border border-slate-800 rounded-lg bg-slate-950/50 text-slate-355 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 h-10 cursor-pointer"
                        />
                      </div>
                    )}

                    {/* Assignee Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Assign Admin</label>
                      <select
                        value={newAssignee}
                        onChange={(e) => setNewAssignee(e.target.value)}
                        className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer h-10"
                      >
                        <option value="">Unassigned</option>
                        {adminsList.map((adm) => (
                          <option key={adm.id} value={adm.id}>
                            {adm.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Transition Comment */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Audit Comment</label>
                      <textarea
                        rows={2}
                        placeholder="Add status details or resolution message..."
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        className="w-full p-2 border border-slate-800 rounded-lg bg-slate-950/50 text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <Button type="submit" className="w-full text-xs py-2.5 font-bold" disabled={isUpdatingStatus}>
                      {isUpdatingStatus ? 'Updating status...' : 'Submit Status Update'}
                    </Button>
                  </form>

                  {/* Audit log timeline */}
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Audit Log History</h4>
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
                /* Notice poster form board */
                <motion.div 
                  key="admin-notice"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="p-6 bg-slate-909 border border-slate-800 rounded-xl shadow-lg space-y-4"
                >
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Megaphone className="w-4 h-4 text-indigo-400" />
                    Publish Community Notice
                  </h3>

                  {noticeSuccess && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs rounded-lg font-semibold">
                      {noticeSuccess}
                    </div>
                  )}

                  <form onSubmit={handlePostNotice} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Notice Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule Water Cut in Block B"
                        value={noticeTitle}
                        onChange={(e) => {
                          setNoticeTitle(e.target.value);
                          setNoticeSuccess(null);
                        }}
                        required
                        className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Notice Content</label>
                      <textarea
                        rows={4}
                        placeholder="Provide announcement details here..."
                        value={noticeContent}
                        onChange={(e) => {
                          setNoticeContent(e.target.value);
                          setNoticeSuccess(null);
                        }}
                        required
                        className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <Button type="submit" className="w-full text-xs py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white border-0 flex items-center justify-center gap-1" disabled={isNoticePosting}>
                      <Plus className="w-3.5 h-3.5" />
                      {isNoticePosting ? 'Publishing...' : 'Publish Announcement'}
                    </Button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* Modal: Register New Resident Account */}
      {isRegisterMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-850">
              <div>
                <h3 className="text-base font-bold text-white">Register New Resident Account</h3>
                <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                  {user?.residential_name ? `${user.residential_name} Authority` : 'Residential Authority Portal'}
                </p>
              </div>
              <button
                onClick={() => setIsRegisterMemberOpen(false)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterMemberSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {memberError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 text-xs rounded-lg font-semibold">
                  {memberError}
                </div>
              )}

              {memberSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-xs rounded-lg font-semibold">
                  {memberSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Resident Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. John Smith"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Phone Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Resident Email *</label>
                  <input
                    type="email"
                    placeholder="resident@example.com"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Initial Password *</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Block *</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={memberBlock}
                    onChange={(e) => setMemberBlock(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Floor *</label>
                  <input
                    type="number"
                    placeholder="e.g. 2"
                    value={memberFloor}
                    onChange={(e) => setMemberFloor(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Flat / House *</label>
                  <input
                    type="text"
                    placeholder="e.g. 204"
                    value={memberHouse}
                    onChange={(e) => setMemberHouse(e.target.value)}
                    required
                    className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                🏢 Apartment / Residential Association: <strong className="text-emerald-400">{user?.residential_name || 'General Community'}</strong>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-800 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisterMemberOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  disabled={isSubmittingMember}
                >
                  {isSubmittingMember ? 'Registering...' : 'Register Resident Account'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Lightbox Image Preview Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white font-extrabold text-xl hover:text-slate-300 cursor-pointer"
            >
              ✕ Close
            </button>
            <img
              src={lightboxUrl}
              alt="Full view attachment"
              className="w-full max-h-[85vh] object-contain rounded-xl border border-slate-800 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Modal: Profile Editing Form */}
      {isProfileOpen && (
        <ProfileEditModal onClose={() => setIsProfileOpen(false)} />
      )}

    </div>
  );
};

export default AdminDashboard;
