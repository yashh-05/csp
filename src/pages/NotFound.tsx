import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="font-sans text-9xl font-extrabold text-primary">404</h1>
      <h2 className="font-sans text-2xl font-bold text-foreground mt-4">Page Not Found</h2>
      <p className="text-muted-foreground text-sm mt-2 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-6 py-2 px-6 bg-primary text-primary-foreground font-semibold rounded-md text-sm shadow-sm hover:bg-primary/95 transition-all"
      >
        Go Back
      </button>
    </div>
  );
};

export default NotFound;
