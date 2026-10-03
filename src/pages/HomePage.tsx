import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ComplaintForm from '../components/layout/ComplaintForm';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Sun, 
  Moon, 
  ArrowRight, 
  Search, 
  Construction, 
  Droplets, 
  Trash2, 
  Lightbulb, 
  Waves, 
  Ban, 
  Trees, 
  Cat
} from 'lucide-react';

interface ComplaintSearchResult {
  id: string;
  title: string;
  description: string;
  category_name: string;
  priority: string;
  status: string;
  house_number: string;
  block: string;
  created_at: string;
  image_url: string | null;
  resolution_image_url: string | null;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  // State controls
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [trackSearchId, setTrackSearchId] = useState('');
  const [trackResult, setTrackResult] = useState<ComplaintSearchResult | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [isSearchingTrack, setIsSearchingTrack] = useState(false);

  // Toggle Theme class on root document
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleReportIssueClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role === 'resident') {
      setIsReportModalOpen(true);
    } else {
      navigate('/admin');
    }
  };

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackSearchId.trim()) return;

    setTrackError(null);
    setTrackResult(null);
    setIsSearchingTrack(true);

    try {
      const res = await api.get<{ complaint: ComplaintSearchResult }>(`/complaints/${trackSearchId.trim()}`);
      setTrackResult(res.complaint);
    } catch (err: any) {
      setTrackError(err.message || 'Complaint record not found. Please verify the ID format (e.g., MAC-A101-20260918-001).');
    } finally {
      setIsSearchingTrack(false);
    }
  };

  // Status color helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">Submitted</span>;
      case 'verified': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Verified</span>;
      case 'assigned': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">Assigned</span>;
      case 'in_progress': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">In Progress</span>;
      case 'resolved': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Resolved</span>;
      case 'closed': return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-400 border border-slate-700">Closed</span>;
      default: return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const categories = [
    {
      id: 'road',
      title: 'Road Potholes',
      description: 'Damaged road surfaces, potholes, and cracks.',
      icon: Construction,
      bgColor: 'bg-amber-500',
      accentColor: 'bg-amber-100/60',
    },
    {
      id: 'water',
      title: 'Water Leakage',
      description: 'Pipeline leaks, burst pipes, water supply issues.',
      icon: Droplets,
      bgColor: 'bg-blue-500',
      accentColor: 'bg-blue-100/60',
    },
    {
      id: 'garbage',
      title: 'Garbage Overflow',
      description: 'Overflowing bins, missed waste collection.',
      icon: Trash2,
      bgColor: 'bg-orange-500',
      accentColor: 'bg-orange-100/60',
    },
    {
      id: 'streetlight',
      title: 'Broken Street Lights',
      description: 'Non-functional street lighting and lamp posts.',
      icon: Lightbulb,
      bgColor: 'bg-yellow-500',
      accentColor: 'bg-yellow-100/60',
    },
    {
      id: 'drainage',
      title: 'Drainage Blockage',
      description: 'Clogged drains, sewage overflow, flooding.',
      icon: Waves,
      bgColor: 'bg-teal-500',
      accentColor: 'bg-teal-100/60',
    },
    {
      id: 'dumping',
      title: 'Illegal Dumping',
      description: 'Unauthorized waste disposal in public areas.',
      icon: Ban,
      bgColor: 'bg-rose-500',
      accentColor: 'bg-rose-100/60',
    },
    {
      id: 'trees',
      title: 'Fallen Trees',
      description: 'Fallen or hazardous trees blocking pathways.',
      icon: Trees,
      bgColor: 'bg-emerald-500',
      accentColor: 'bg-emerald-100/60',
    },
    {
      id: 'animals',
      title: 'Stray Animals',
      description: 'Stray animal sightings causing safety concerns.',
      icon: Cat,
      bgColor: 'bg-purple-500',
      accentColor: 'bg-purple-100/60',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-primary selection:text-white">
      
      {/* HEADER NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                MyArea Connect
              </span>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Community Issue Portal
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-full border border-slate-200/80 dark:border-slate-700/50">
            <a href="#home" className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-full shadow-sm">
              Home
            </a>
            <a href="#about" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
              About
            </a>
            <button onClick={handleReportIssueClick} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors cursor-pointer">
              Report Issue
            </button>
            <button onClick={() => setIsTrackModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors cursor-pointer">
              Track Complaint
            </button>
            <a href="#updates" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
              Community Updates
            </a>
            <a href="#contact" className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-full transition-colors">
              Contact
            </a>
          </nav>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={user?.role === 'admin' ? '/admin' : '/dashboard'}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
                >
                  Dashboard ({user?.name})
                </Link>
                <button
                  onClick={logout}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Resident Login
                </Link>
                <Link
                  to="/admin-login"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full shadow-md shadow-blue-600/25 transition-all hover:scale-[1.02]"
                >
                  Authority Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO BANNER SECTION */}
      <section id="home" className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden">
        
        {/* Background Overlay & High Resolution Neighborhood Visual */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/80 to-slate-900/70 z-10" />
        <img
          src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=2000&q=80"
          alt="Neighborhood Community"
          className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.05]"
        />

        {/* Hero Content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl space-y-6"
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Community Portal</span>
            </div>

            {/* Header Labels */}
            <div>
              <p className="text-xs sm:text-sm font-bold text-blue-400 uppercase tracking-widest mb-2 font-mono">
                LOCAL COMMUNITY ISSUE REPORTING & TRACKING SYSTEM
              </p>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
                MyArea Connect
              </h1>
            </div>

            {/* Subtext */}
            <p className="text-lg sm:text-xl text-slate-200 font-medium leading-relaxed">
              Report Local Issues.<br />
              Track Every Complaint.<br />
              Build a Better Community Together.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={handleReportIssueClick}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:translate-y-[-2px] cursor-pointer"
              >
                <span>Report an Issue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsTrackModalOpen(true)}
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-sm rounded-xl transition-all hover:translate-y-[-2px] cursor-pointer"
              >
                Track Complaint
              </button>

              <Link
                to="/login"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-sm rounded-xl transition-all hover:translate-y-[-2px]"
              >
                Resident Login
              </Link>

              <Link
                to="/admin-login"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-sm rounded-xl transition-all hover:translate-y-[-2px]"
              >
                Admin Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMMON ISSUE CATEGORIES SECTION */}
      <section id="about" className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-extrabold tracking-wider uppercase">
              WHAT YOU CAN REPORT
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Common Issue Categories
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed font-normal">
              Report a wide range of neighborhood issues. Each category is routed to the right department for quick resolution.
            </p>
          </div>

          {/* Cards Grid matching design photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {categories.map((cat, idx) => {
              const IconComp = cat.icon;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  onClick={handleReportIssueClick}
                  className="relative p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 group cursor-pointer overflow-hidden"
                >
                  {/* Decorative Corner Pastel Shape matching reference screenshot */}
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full ${cat.accentColor} dark:opacity-20 pointer-events-none transition-transform group-hover:scale-110`} />

                  {/* Icon Badge */}
                  <div className={`w-12 h-12 rounded-2xl ${cat.bgColor} text-white flex items-center justify-center shadow-md mb-6 relative z-10 group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  {/* Category Title & Details */}
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {cat.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

        </div>
      </section>

      {/* QUICK TRACKING MODAL */}
      <AnimatePresence>
        {isTrackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Track Complaint Status</h3>
                </div>
                <button
                  onClick={() => {
                    setIsTrackModalOpen(false);
                    setTrackResult(null);
                    setTrackError(null);
                    setTrackSearchId('');
                  }}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search Form */}
              <div className="p-6 space-y-6">
                <form onSubmit={handleTrackSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Complaint ID (e.g. MAC-B204-20260918-001)"
                    value={trackSearchId}
                    onChange={(e) => setTrackSearchId(e.target.value)}
                    className="flex-1 p-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSearchingTrack}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    {isSearchingTrack ? 'Searching...' : 'Track'}
                  </button>
                </form>

                {trackError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium">
                    {trackError}
                  </div>
                )}

                {/* Track Result Card */}
                {trackResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">{trackResult.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{trackResult.title}</h4>
                      </div>
                      {getStatusBadge(trackResult.status)}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {trackResult.description}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div>Category: <strong className="text-slate-900 dark:text-white">{trackResult.category_name}</strong></div>
                      <div>Priority: <strong className="text-slate-900 dark:text-white uppercase">{trackResult.priority}</strong></div>
                      <div>Location: Block {trackResult.block} - Flat {trackResult.house_number}</div>
                      <div>Date: {new Date(trackResult.created_at).toLocaleDateString()}</div>
                    </div>

                    {trackResult.image_url && (
                      <div className="pt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attached Image</p>
                        <img
                          src={trackResult.image_url.startsWith('http') ? trackResult.image_url : `${BACKEND_URL}${trackResult.image_url}`}
                          alt="Complaint visual reference"
                          className="w-full h-36 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT ISSUE COMPLAINT FORM MODAL */}
      {isReportModalOpen && (
        <ComplaintForm
          defaultBlock={user?.block || ''}
          defaultHouse={user?.house_number || ''}
          defaultFloor={user?.floor || undefined}
          defaultPhone={user?.phone || ''}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            setIsReportModalOpen(false);
            navigate('/dashboard');
          }}
        />
      )}

      {/* FOOTER */}
      <footer id="contact" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <Shield className="w-5 h-5 text-blue-600" />
            MyArea Connect
          </div>
          <p>© 2026 MyArea Connect. Local Community Issue Reporting & Management System.</p>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
