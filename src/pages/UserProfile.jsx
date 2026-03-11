import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Share2, Check, User } from 'lucide-react';

export default function UserProfile() {
    const { uniqueName } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            try {
                const q = query(collection(db, 'users'), where('uniqueName', '==', uniqueName.toLowerCase()));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty && isMounted) {
                    setProfile(querySnapshot.docs[0].data());
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchProfile();
        return () => { isMounted = false; };
    }, [uniqueName]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-[color:var(--theme-bg)] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md mb-4 flex items-center">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[color:var(--theme-text-muted)] hover:text-[color:var(--theme-text-primary)] font-bold text-sm">
                    <ArrowLeft size={16} /> Back
                </button>
            </div>

            <div className="w-full max-w-md bg-[color:var(--theme-surface)] rounded-3xl shadow-xl overflow-hidden border border-[color:var(--theme-border)]">

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-8 h-8 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : !profile ? (
                    <div className="p-12 text-center text-[color:var(--theme-text-secondary)] font-medium">
                        Player not found.
                    </div>
                ) : (
                    <>
                        <div className="relative h-32 bg-gradient-to-br from-[#00A859] to-[#005A9C]">
                            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                                <div className="w-24 h-24 rounded-full border-4 border-[color:var(--theme-surface)] bg-white overflow-hidden shadow-lg relative">
                                    {profile.photoUrl ? (
                                        <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[color:var(--theme-surface-hover)]">
                                            <User size={40} className="text-[color:var(--theme-text-muted)]" />
                                        </div>
                                    )}
                                    {profile.isGuest && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                                            <span className="text-white text-xs font-bold uppercase tracking-widest">GUEST</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-16 pb-8 px-6 text-center">
                            <h1 className="text-2xl font-black text-[color:var(--theme-text-primary)]">{profile.uniqueName}</h1>
                            <p className="text-sm font-medium text-[color:var(--theme-text-muted)] mt-1">
                                {profile.isGuest ? 'Guest Player' : 'Registered Member'}
                            </p>

                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleShare}
                                    className="flex items-center gap-2 px-6 py-3 bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] rounded-full text-[color:var(--theme-text-primary)] font-bold hover:border-[#00A859] transition-colors shadow-sm"
                                >
                                    {copied ? <Check size={18} className="text-[#00A859]" /> : <Share2 size={18} className="text-[#005A9C]" />}
                                    {copied ? 'Copied Link!' : 'Share Profile'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
