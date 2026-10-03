import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/button';
import { motion } from 'framer-motion';

// Schema for input validation
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook-form initialization
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  /**
   * Submit login details to backend
   */
  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post<{ token: string; user: any }>('/auth/login', {
        ...data,
        role: 'admin'
      });
      
      // Enforce Residential Authority Portal role verification
      if (response.user.role !== 'admin') {
        throw new Error('Access denied. This portal is for Residential Authorities only. Residents please use the Resident Portal.');
      }

      // Update global context
      login(response.token, response.user);
      
      // Redirect to admin panel
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'No account found matching these credentials. Please create an account first.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden font-sans">
      {/* Background glowing effects tailored for Residential Authority portal */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            MyArea Connect
          </h1>
          <p className="text-emerald-400 text-xs mt-2 font-bold tracking-wider uppercase">
            Residential Authority Portal
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-950/40 border border-red-900/50 text-red-300 text-xs rounded-xl font-semibold space-y-2 text-center"
          >
            <p>{error}</p>
            <Link
              to="/admin-register"
              className="inline-block mt-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md"
            >
              Create an Account First ➔
            </Link>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="email">
              Authority Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="authority@myarea.com"
              {...register('email')}
              className="w-full p-3 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.email && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full p-3 border border-slate-800 rounded-lg bg-slate-950/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all"
            />
            {errors.password && (
              <p className="text-xs text-red-400 font-semibold mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full py-3 mt-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white border-0 cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating Authority...' : 'Sign In as Residential Authority'}
          </Button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-400">
          Don't have a Residential Authority account?{' '}
          <Link to="/admin-register" className="text-emerald-400 hover:underline font-bold">
            Create an Account First
          </Link>
        </div>

        {/* Separated Resident access link */}
        <div className="border-t border-slate-800 mt-6 pt-4 text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-350 font-semibold transition-colors">
            Are you a Resident? Access Portal ➔
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
