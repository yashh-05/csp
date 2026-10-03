import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/button';
import { motion } from 'framer-motion';

// Schema for Resident Login validation
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Full Name (as registered by authority) is required'),
  residentialName: z.string().min(2, 'Apartment / Residential Name is required'),
  floor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int({ message: 'Floor number is required' })
  ),
  houseNumber: z.string().min(1, 'House / Flat number is required'),
  block: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
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
        role: 'resident'
      });
      
      // Enforce Resident Portal role verification
      if (response.user.role !== 'resident') {
        throw new Error('Access denied. This portal is for Residents only. Administrators please use the Admin Portal.');
      }

      // Update global context
      login(response.token, response.user);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-card/75 backdrop-blur-md rounded-2xl border border-border/80 shadow-xl relative z-10"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
            MyArea Connect
          </h1>
          <p className="text-muted-foreground text-xs mt-2 font-medium tracking-wide uppercase">
            Resident Portal Sign In
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg font-semibold"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="email">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
            />
            {errors.email && (
              <p className="text-xs text-destructive font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="name">
              Full Name (as registered by authority) *
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. John Smith"
              {...register('name')}
              className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
            />
            {errors.name && (
              <p className="text-xs text-destructive font-semibold mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="residentialName">
              Apartment / Residential Name *
            </label>
            <input
              id="residentialName"
              type="text"
              placeholder="e.g. Skyline Heights Apartments"
              {...register('residentialName')}
              className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
            />
            {errors.residentialName && (
              <p className="text-xs text-destructive font-semibold mt-1">{errors.residentialName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="floor">
                Floor *
              </label>
              <input
                id="floor"
                type="number"
                placeholder="e.g. 2"
                {...register('floor')}
                className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
              />
              {errors.floor && (
                <p className="text-xs text-destructive font-semibold mt-1">{errors.floor.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="houseNumber">
                Flat / House *
              </label>
              <input
                id="houseNumber"
                type="text"
                placeholder="e.g. 204"
                {...register('houseNumber')}
                className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
              />
              {errors.houseNumber && (
                <p className="text-xs text-destructive font-semibold mt-1">{errors.houseNumber.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="block">
                Block (Opt)
              </label>
              <input
                id="block"
                type="text"
                placeholder="e.g. A"
                {...register('block')}
                className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
              />
              {errors.block && (
                <p className="text-xs text-destructive font-semibold mt-1">{errors.block.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="password">
              Password *
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className="w-full p-2.5 border border-input rounded-lg bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
            />
            {errors.password && (
              <p className="text-xs text-destructive font-semibold mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full py-3 mt-2 text-sm font-bold" disabled={isSubmitting}>
            {isSubmitting ? 'Authenticating Resident...' : 'Sign In as Resident'}
          </Button>
        </form>

        <div className="mt-6 p-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-xl font-medium leading-relaxed text-center">
          🔒 <strong>Note:</strong> Resident accounts are registered directly by your Residential Authority / Apartment Management. Please log in using the credentials provided by your authority.
        </div>

        {/* Separated Residential Authority access link */}
        <div className="border-t border-border/60 mt-6 pt-4 text-center">
          <Link to="/admin-login" className="text-xs text-muted-foreground hover:text-indigo-400 font-semibold transition-colors">
            Are you a Residential Authority? Access Portal ➔
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
