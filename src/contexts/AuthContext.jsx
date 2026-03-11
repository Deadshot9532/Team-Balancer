import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Authentication methods
    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const loginAsGuest = async () => {
        return signInAnonymously(auth);
    };

    const logout = () => {
        return signOut(auth);
    };

    // Profile Methods
    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
                return docSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    };

    const updateUserProfile = async (uid, data) => {
        try {
            const docRef = doc(db, 'users', uid);
            await setDoc(docRef, data, { merge: true });
            setUserProfile((prev) => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    };

    useEffect(() => {
        if (!auth || Object.keys(auth).length === 0) {
            setLoading(false);
            return;
        }

        // Safety timeout: if Firebase doesn't respond in 5 seconds, stop loading
        const timer = setTimeout(() => {
            if (loading) {
                console.warn("Auth initialization timed out after 5s");
                setLoading(false);
            }
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            clearTimeout(timer);
            setCurrentUser(user);
            setLoading(false); // Release the loading screen immediately!

            try {
                if (user) {
                    const profile = await fetchUserProfile(user.uid);
                    if (!profile && user.isAnonymous) {
                        try {
                            const guestData = {
                                uid: user.uid,
                                displayName: "Guest",
                                isGuest: true,
                                photoUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=" + user.uid
                            };
                            await updateUserProfile(user.uid, guestData);
                        } catch (guestErr) {
                            console.error("Failed to initialize guest profile:", guestErr);
                        }
                    } else if (!profile && !user.isAnonymous) {
                        try {
                            const initialData = {
                                uid: user.uid,
                                displayName: user.displayName || "Player",
                                photoUrl: user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`,
                                isGuest: false,
                                email: user.email
                            };
                            await updateUserProfile(user.uid, initialData);
                        } catch (onboardErr) {
                            console.error("Failed to initialize player profile:", onboardErr);
                        }
                    }
                } else {
                    setUserProfile(null);
                }
            } catch (err) {
                console.error("Auth state change error during profile fetch:", err);
            }
        });

        return () => {
            clearTimeout(timer);
            unsubscribe();
        };
    }, []);

    const value = {
        currentUser,
        userProfile,
        loginWithGoogle,
        loginAsGuest,
        logout,
        updateUserProfile,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen bg-[color:var(--theme-bg)] flex flex-col items-center justify-center p-4">
                    <div className="w-16 h-16 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-xl font-bold text-[color:var(--theme-text-primary)]">Connecting to the Server...</h2>
                    <p className="text-sm text-[color:var(--theme-text-secondary)] mt-2">If this takes more than a few seconds, please check your Firebase API key in the .env file.</p>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
