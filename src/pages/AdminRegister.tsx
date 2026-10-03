import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/button';
import { motion } from 'framer-motion';

// Schema for registration validation (Residential Authority)
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  residentialName: z.string().min(2, 'Residential / Society Name is required for Residential Authorities.'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export const AdminRegister: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook-form initialization
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  /**
   * Submit registration to backend
   */
  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post<{ token: string; user: any }>('/auth/register', {
        ...data,
        role: 'admin'
      });
      
      // Auto login user on registration success
      login(response.token, response.user);
      
      // Redirect user to admin dashboard
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Failed to register residential authority.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden font-sans">
      {/* Background glowing effects tailored for Residential Authority portal */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl relative z-10"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Authority Registration
          </h1>
          <p className="text-emerald-400 text-xs mt-2 font-bold tracking-wider uppercase">
            Create Residential Authority Account
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-red-950/40 border border-red-900/50 text-red-400 text-xs rounded-lg font-semibold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="name">
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.name && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="email">
              Authority Email Address *
            </label>
            <input
              id="email"
              type="email"
              placeholder="authority@myarea.com"
              {...register('email')}
              className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.email && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="residentialName">
              Residential Association / Apartment Name *
            </label>
            <input
              id="residentialName"
              type="text"
              placeholder="e.g. Skyline Heights Apartments"
              {...register('residentialName')}
              className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.residentialName && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.residentialName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="phone">
              Phone Number (Optional)
            </label>
            <input
              id="phone"
              type="text"
              placeholder="e.g. 9876543210"
              {...register('phone')}
              className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.phone && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="password">
              Password *
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full p-2.5 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.password && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full py-3 mt-4 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-0 cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Register as Residential Authority'}
          </Button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/admin-login" className="text-emerald-400 hover:underline font-bold">
            Sign In Here
          </Link>
        </div>

        {/* Separated Resident login link */}
        <div className="border-t border-slate-800 mt-6 pt-4 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-350 font-semibold transition-colors">
            Are you a Resident? Access Login Portal ➔
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminRegister;
