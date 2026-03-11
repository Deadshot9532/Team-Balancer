import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
    const { loginWithGoogle, loginAsGuest } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            console.error("Google Login Error:", err);
            setError(`Google Error: ${err.message || 'Unknown error'}`);
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        try {
            setError('');
            setLoading(true);
            await loginAsGuest();
            navigate('/');
        } catch (err) {
            console.error("Guest Login Error:", err);
            setError(`Guest Error: ${err.message || 'Unknown error'}`);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[color:var(--theme-bg)] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-[color:var(--theme-surface)] rounded-2xl shadow-xl overflow-hidden border border-[color:var(--theme-border)]"
            >
                <div className="p-8 text-center space-y-2 bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)]">
                    <div className="w-16 h-16 bg-[#00A859] rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-[#00A859]/20 mb-4 transform -rotate-6">
                        <Swords size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[color:var(--theme-text-primary)] uppercase">
                        Team<span className="text-[#00A859]">Balancer</span>
                    </h1>
                    <p className="text-[color:var(--theme-text-secondary)] text-sm">Sign in to manage teams and share your profile</p>
                </div>

                <div className="p-8 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 bg-white text-gray-800 font-bold rounded-xl flex items-center justify-center gap-3 shadow-sm border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <div className="relative py-4 flex items-center">
                        <div className="flex-grow border-t border-[color:var(--theme-border)]"></div>
                        <span className="shrink-0 px-4 text-xs font-semibold text-[color:var(--theme-text-muted)] uppercase tracking-wider">OR</span>
                        <div className="flex-grow border-t border-[color:var(--theme-border)]"></div>
                    </div>

                    <button
                        disabled={loading}
                        onClick={handleGuestLogin}
                        className="w-full py-3.5 bg-[color:var(--theme-surface-hover)] text-[color:var(--theme-text-primary)] font-bold rounded-xl flex items-center justify-center gap-3 shadow-sm border border-[color:var(--theme-border)] hover:bg-[color:var(--theme-border)] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <User size={20} className="text-[color:var(--theme-text-secondary)]" />
                        Play as Guest
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
