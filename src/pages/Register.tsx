import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/button';
import { motion } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md p-8 bg-card/75 backdrop-blur-md rounded-2xl border border-border/80 shadow-xl relative z-10 text-center"
      >
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
          <Lock className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">
          Resident Accounts are Authority-Managed
        </h1>

        <p className="text-muted-foreground text-xs leading-relaxed mb-6">
          Direct resident registration is disabled. Resident accounts must be created directly by your <strong>Residential Authority / Apartment Management</strong>.
        </p>

        <div className="p-4 bg-secondary/60 rounded-xl border border-border/80 text-left text-xs space-y-2 mb-6">
          <p className="font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-primary" />
            How to get your login credentials:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 pl-1">
            <li>Contact your apartment association / building management.</li>
            <li>Provide your Name, Block, Floor, Flat No, and Phone number.</li>
            <li>The authority will register your account and provide your password.</li>
          </ul>
        </div>

        <Button 
          onClick={() => navigate('/login')} 
          className="w-full py-3 text-sm font-bold shadow-md cursor-pointer"
        >
          Go to Resident Login
        </Button>

        <div className="border-t border-border/60 mt-6 pt-4 text-center">
          <Link to="/admin-login" className="text-xs text-muted-foreground hover:text-indigo-400 font-semibold transition-colors">
            Are you a Residential Authority? Access Portal ➔
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
