import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Check, Camera, RefreshCw } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const STICKERS = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Max',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Buster',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Peanut',
];

export default function Onboarding() {
    const { currentUser, userProfile, updateUserProfile } = useAuth();
    const navigate = useNavigate();
    const [uniqueName, setUniqueName] = useState('');
    const [selectedSticker, setSelectedSticker] = useState(STICKERS[0]);
    const [customPhotoUrl, setCustomPhotoUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // If not logged in, go to login
        if (!currentUser) {
            navigate('/login');
        }
        // If they already have a unique name, they are onboarded
        if (userProfile?.uniqueName) {
            navigate('/');
        }

        // Set initial sticker to their default photo URL if they have one
        if (userProfile?.photoUrl && !STICKERS.includes(userProfile.photoUrl)) {
            // They might have a generic dicebear or google photo
            // For simplicity, we just use STICKERS[0] if it's not in the array
        }
    }, [currentUser, userProfile, navigate]);

    const withTimeout = (promise, ms, errorMessage) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms))
        ]);
    };

    const checkUsernameUnique = async (username) => {
        const q = query(collection(db, 'users'), where('uniqueName', '==', username.toLowerCase()));
        const querySnapshot = await withTimeout(
            getDocs(q),
            6000,
            "Database connection failed. Did you click 'Create Database' in Firestore?"
        );
        return querySnapshot.empty;
    };

    const handleComplete = async (e) => {
        e.preventDefault();
        if (!uniqueName.trim()) {
            setError("Please enter a unique name");
            return;
        }
        if (uniqueName.length < 3) {
            setError("Name must be at least 3 characters");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(uniqueName)) {
            setError("Name can only contain letters, numbers, and underscores");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const isUnique = await checkUsernameUnique(uniqueName);
            if (!isUnique) {
                setError("This name is already taken!");
                setLoading(false);
                return;
            }

            const finalPhotoUrl = customPhotoUrl.trim() !== '' ? customPhotoUrl.trim() : selectedSticker;

            await withTimeout(
                updateUserProfile(currentUser.uid, {
                    uniqueName: uniqueName.toLowerCase(),
                    photoUrl: finalPhotoUrl,
                }),
                6000,
                "Failed to save profile. Please check your Firestore permissions (must be Test Mode)."
            );

            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to update profile. Try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[color:var(--theme-bg)] flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[color:var(--theme-surface)] rounded-2xl shadow-xl overflow-hidden border border-[color:var(--theme-border)]"
            >
                <div className="p-6 border-b border-[color:var(--theme-border)] flex flex-col items-center">
                    <h2 className="text-xl font-bold text-[color:var(--theme-text-primary)] mb-1">Set Up Your Profile</h2>
                    <p className="text-sm text-[color:var(--theme-text-secondary)] text-center">Choose how you appear to other players.</p>
                </div>

                <form onSubmit={handleComplete} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    {/* Avatar Selection */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-[color:var(--theme-text-primary)]">Select Avatar</label>
                        <div className="flex justify-center mb-4">
                            <div className="w-24 h-24 rounded-full bg-[color:var(--theme-surface-hover)] border-4 border-[color:var(--theme-border)] shadow-md overflow-hidden relative group">
                                <img src={selectedSticker} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {STICKERS.map((sticker) => (
                                <button
                                    key={sticker}
                                    type="button"
                                    onClick={() => {
                                        setSelectedSticker(sticker);
                                        setCustomPhotoUrl('');
                                    }}
                                    className={`w-full aspect-square rounded-xl flex items-center justify-center p-2 transition-all ${(selectedSticker === sticker && !customPhotoUrl)
                                        ? 'border-2 border-[#00A859] bg-[color:var(--theme-green-light)] scale-105'
                                        : 'border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-hover)] hover:border-[#00A859]/50'
                                        }`}
                                >
                                    <img src={sticker} alt="Sticker option" className="w-full h-full object-contain drop-shadow-sm" />
                                </button>
                            ))}
                        </div>

                        <div className="pt-2">
                            <label className="block text-xs font-bold text-[color:var(--theme-text-secondary)] mb-1 uppercase tracking-wider">Or Use Custom Photo URL</label>
                            <input
                                type="url"
                                value={customPhotoUrl}
                                onChange={(e) => {
                                    setCustomPhotoUrl(e.target.value);
                                    if (e.target.value) setSelectedSticker(e.target.value);
                                }}
                                placeholder="https://example.com/my-photo.jpg"
                                className="w-full bg-[color:var(--theme-bg)] border border-[color:var(--theme-border)] text-sm text-[color:var(--theme-text-primary)] rounded-lg py-2.5 px-4 focus:outline-none focus:border-[#00A859] transition-all"
                            />
                        </div>
                    </div>

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[color:var(--theme-text-primary)]">Unique Player Name</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--theme-text-muted)] font-bold">@</span>
                            <input
                                type="text"
                                value={uniqueName}
                                onChange={(e) => setUniqueName(e.target.value)}
                                placeholder="shadow_hunter99"
                                className="w-full bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] rounded-xl py-3 pl-8 pr-4 focus:outline-none focus:border-[#00A859] focus:ring-1 focus:ring-[#00A859] font-medium transition-all"
                            />
                        </div>
                        <p className="text-[10px] text-[color:var(--theme-text-muted)]">This will be used by others to invite you to teams.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-[#00A859] text-white font-bold rounded-xl shadow-md hover:bg-[#008746] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
                        Complete Setup
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
