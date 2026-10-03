import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth, User } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../ui/button';
import { motion } from 'framer-motion';

interface ProfileEditModalProps {
  onClose: () => void;
}

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().or(z.literal('')),
  block: z.string().optional(),
  houseNumber: z.string().optional(),
  floor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isResident = user?.role === 'resident';

  // Hook-form initialization prefilled with current user info
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      block: user?.block || '',
      houseNumber: user?.house_number || '',
      floor: user?.floor,
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await api.put<{ user: User }>('/auth/profile', data);
      updateUser(response.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card w-full max-w-md border border-border shadow-lg rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-secondary">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Edit Profile Details</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground font-semibold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-md font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md font-semibold animate-pulse">
              {success}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full p-2 border border-input rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.name && (
              <p className="text-[10px] text-destructive font-semibold">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="text"
              {...register('phone')}
              className="w-full p-2 border border-input rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.phone && (
              <p className="text-[10px] text-destructive font-semibold">{errors.phone.message}</p>
            )}
          </div>

          {/* Conditional Address fields for Residents only */}
          {isResident && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="block">Block</label>
                  <input
                    id="block"
                    type="text"
                    {...register('block')}
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="houseNumber">House No.</label>
                  <input
                    id="houseNumber"
                    type="text"
                    {...register('houseNumber')}
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider" htmlFor="floor">Floor</label>
                <input
                  id="floor"
                  type="number"
                  {...register('floor')}
                  className="w-full p-2 border border-input rounded-md bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {errors.floor && (
                  <p className="text-[10px] text-destructive font-semibold">{errors.floor.message}</p>
                )}
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting ? 'Updating...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileEditModal;
