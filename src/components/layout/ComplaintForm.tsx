import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import Button from '../ui/button';

interface ComplaintFormProps {
  onClose: () => void;
  onSuccess: () => void;
  defaultBlock?: string;
  defaultHouse?: string;
  defaultFloor?: number;
  defaultPhone?: string;
}

interface Category {
  id: string;
  name: string;
}

// Zod validation for inputs
const complaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  description: z.string().min(10, 'Please describe the issue in at least 10 characters.'),
  categoryId: z.string().min(1, 'Category is required.'),
  priority: z.enum(['low', 'medium', 'high', 'emergency']),
  block: z.string().min(1, 'Block is required.'),
  houseNumber: z.string().min(1, 'House/Flat number is required.'),
  floor: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().optional()
  ),
  contactNumber: z.string().min(10, 'Contact number must be at least 10 digits.'),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

export const ComplaintForm: React.FC<ComplaintFormProps> = ({
  onClose,
  onSuccess,
  defaultBlock = '',
  defaultHouse = '',
  defaultFloor,
  defaultPhone = '',
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Hook-form initialization
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      block: defaultBlock,
      houseNumber: defaultHouse,
      floor: defaultFloor,
      contactNumber: defaultPhone,
      priority: 'medium',
    },
  });

  // Fetch categories from the database on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<{ categories: Category[] }>('/categories');
        setCategories(response.categories);
      } catch (err: any) {
        console.error('[ComplaintForm] Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  /**
   * Submit the complaint multipart Form Data
   */
  const onSubmit = async (data: ComplaintFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('categoryId', data.categoryId);
      formData.append('priority', data.priority);
      formData.append('block', data.block);
      formData.append('houseNumber', data.houseNumber);
      
      if (data.floor !== undefined && data.floor !== null) {
        formData.append('floor', String(data.floor));
      }
      
      formData.append('contactNumber', data.contactNumber);
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await api.postFormData('/complaints', formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint. Please check fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg border border-border shadow-lg rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-secondary">
          <h2 className="text-lg font-bold text-foreground font-sans">Report Community Issue</h2>
          <button 
            type="button"
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground font-semibold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="title">Issue Title</label>
            <input
              id="title"
              type="text"
              placeholder="e.g., Water leakage in lobby area"
              {...register('title')}
              className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="description">Detailed Description</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Please provide specifics (e.g., location, timing, severity)..."
              {...register('description')}
              className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="categoryId">Category</label>
              <select
                id="categoryId"
                {...register('categoryId')}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm h-10 cursor-pointer"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="priority">Priority Level</label>
              <select
                id="priority"
                {...register('priority')}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm h-10 cursor-pointer"
              >
                <option value="low">Low (Standard)</option>
                <option value="medium">Medium (Moderate)</option>
                <option value="high">High (Urgent)</option>
                <option value="emergency">Emergency (Immediate danger)</option>
              </select>
              {errors.priority && (
                <p className="text-xs text-destructive mt-1">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="block">Block</label>
              <input
                id="block"
                type="text"
                placeholder="e.g., A"
                {...register('block')}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              {errors.block && (
                <p className="text-xs text-destructive mt-1">{errors.block.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="houseNumber">House No.</label>
              <input
                id="houseNumber"
                type="text"
                placeholder="e.g., 101"
                {...register('houseNumber')}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              {errors.houseNumber && (
                <p className="text-xs text-destructive mt-1">{errors.houseNumber.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="floor">Floor</label>
              <input
                id="floor"
                type="number"
                placeholder="e.g., 1"
                {...register('floor')}
                className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              {errors.floor && (
                <p className="text-xs text-destructive mt-1">{errors.floor.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="contactNumber">Contact Number</label>
            <input
              id="contactNumber"
              type="text"
              placeholder="e.g., 9876543210"
              {...register('contactNumber')}
              className="w-full p-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            {errors.contactNumber && (
              <p className="text-xs text-destructive mt-1">{errors.contactNumber.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="image">Attach Reference Image (Optional)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80 file:cursor-pointer"
            />
            {selectedFile && (
              <div className="mt-2 relative inline-block border border-border rounded-lg overflow-hidden bg-secondary/50 p-1">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Selected reference preview"
                  className="h-28 w-auto object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-md cursor-pointer hover:scale-110 transition-transform"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'File Issue'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintForm;
