import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Swords, Share2, History, Trash2,
    Plus, Minus, Save, Check, Clock, Settings, UserPlus, HelpCircle, Moon, Sun, Search, User
} from 'lucide-react';
import LZString from 'lz-string';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

// --- Utils ---
const balanceTeams = (players, teamCount) => {
    const sorted = [...players].sort((a, b) => b.strength - a.strength);
    const teams = Array.from({ length: teamCount }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        players: [],
        power: 0
    }));

    for (const p of sorted) {
        const team = teams.reduce((min, t) => t.power < min.power ? t : min, teams[0]);
        team.players.push(p);
        team.power += p.strength;
    }

    return {
        teams,
        timestamp: new Date().toLocaleString(),
        eventLog: `Balanced formation created on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
    };
};

export default function Home() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('players');
    const [teamCount, setTeamCount] = useState(2);
    const [players, setPlayers] = useState([]);
    const [history, setHistory] = useState([]);
    const [results, setResults] = useState(null);
    const [copied, setCopied] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [userRole, setUserRole] = useState('moderator');
    const [isDarkMode, setIsDarkMode] = useState(false);

    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        // Check local storage or system preference for dark mode
        const storedTheme = window.localStorage.getItem('team_balancer_theme');
        if (storedTheme === 'dark') {
            setIsDarkMode(true);
        } else if (storedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
        }

        const params = new URLSearchParams(window.location.search);
        const sharedData = params.get('g');
        const roleParam = params.get('r');

        if (roleParam === 'v') setUserRole('visitor');

        if (sharedData) {
            try {
                const decoded = JSON.parse(LZString.decompressFromEncodedURIComponent(sharedData));
                if (decoded.players) setPlayers(decoded.players);
                if (decoded.teamCount) setTeamCount(decoded.teamCount);
                if (decoded.results) {
                    setResults(decoded.results);
                    setActiveTab('teams');
                }
            } catch (e) {
                console.error("Failed to decode shared data", e);
            }
        } else {
            // Initialize with default players if no shared data
            setPlayers([{
                id: currentUser.uid,
                name: userProfile?.uniqueName || "Me",
                strength: 5,
                photoUrl: userProfile?.photoUrl
            }, ...Array.from({ length: 3 }).map((_, i) => ({
                id: Date.now() + i,
                name: "",
                strength: 5,
            }))]);
        }

        const savedHistory = localStorage.getItem('team_balancer_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
    }, [currentUser, userProfile]);

    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode;
        setIsDarkMode(newDarkMode);
        window.localStorage.setItem('team_balancer_theme', newDarkMode ? 'dark' : 'light');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const addPlayer = () => {
        setPlayers([{
            id: Date.now(),
            name: "",
            strength: 5,
        }, ...players]);
    };

    const removePlayer = (id) => {
        if (players.length > teamCount) {
            setPlayers(players.filter(p => p.id !== id));
        }
    };

    const updatePlayer = (id, field, value) => {
        setPlayers(players.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleBalance = () => {
        setIsShuffling(true);
        setResults(null);
        setTimeout(() => {
            const res = balanceTeams(players, teamCount);
            setResults(res);
            const newHistory = [{
                log: res.eventLog,
                id: Date.now()
            }, ...history].slice(0, 10);
            setHistory(newHistory);
            localStorage.setItem('team_balancer_history', JSON.stringify(newHistory));
            setIsShuffling(false);
        }, 800);
    };

    const generateShareLink = (targetRole = 'visitor') => {
        const data = { players, teamCount, results };
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(data));
        const roleKey = targetRole === 'visitor' ? 'v' : 'm';
        const url = `${window.location.origin}${window.location.pathname}?g=${compressed}&r=${roleKey}`;

        navigator.clipboard.writeText(url);
        setCopied(targetRole);
        setTimeout(() => setCopied(false), 2000);
    };

    const searchPlayer = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchResult(null);

        try {
            const q = query(collection(db, 'users'), where('uniqueName', '==', searchQuery.toLowerCase().trim()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setSearchResult(querySnapshot.docs[0].data());
            } else {
                setSearchResult('not_found');
            }
        } catch (err) {
            console.error(err);
        }
        setIsSearching(false);
    };

    const addSearchedPlayer = () => {
        if (searchResult && searchResult !== 'not_found') {
            // Check if already in list
            if (!players.find(p => p.id === searchResult.uid)) {
                setPlayers([{
                    id: searchResult.uid,
                    name: searchResult.uniqueName,
                    strength: 5,
                    photoUrl: searchResult.photoUrl
                }, ...players]);
            }
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResult(null);
        }
    };

    const isVisitor = userRole === 'visitor';

    const renderPlayersTab = () => (
        <div className="pb-24 space-y-4 relative">
            <div className="flex justify-between items-center mb-4 px-1">
                <div>
                    <h2 className="text-xl font-bold text-[color:var(--theme-text-primary)]">Squad Members</h2>
                    <p className="text-xs text-[color:var(--theme-text-muted)] font-medium">Total: {players.length} Players</p>
                </div>
                {!isVisitor && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowSearchModal(true)}
                            className="flex items-center gap-1 px-3 py-2 bg-[color:var(--theme-blue-light)] text-[#005A9C] rounded-md font-bold transition-colors shadow-sm text-sm"
                        >
                            <Search size={16} /> SEARCH
                        </button>
                        <button
                            onClick={addPlayer}
                            className="flex items-center gap-1 px-3 py-2 bg-[color:var(--theme-green-light)] text-[#00A859] rounded-md font-bold transition-colors shadow-sm text-sm"
                        >
                            <UserPlus size={16} /> ADD
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                    {players.map((p, idx) => (
                        <motion.div
                            key={p.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="material-card p-4 relative group flex flex-col gap-3"
                        >
                            <div className="flex items-center gap-3 w-full">
                                {p.photoUrl ? (
                                    <img src={p.photoUrl} alt="PFP" className="w-10 h-10 rounded-full bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] shadow-sm object-cover flex-shrink-0" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] flex flex-shrink-0 items-center justify-center font-bold text-[color:var(--theme-text-secondary)] shadow-sm">
                                        {idx + 1}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <input
                                        className={`w-full border-b border-[color:var(--theme-border)] focus:border-[#00A859] px-1 py-1 font-semibold text-lg placeholder:text-[color:var(--theme-text-muted)] placeholder:font-normal bg-transparent ${isVisitor ? 'pointer-events-none' : ''}`}
                                        value={p.name}
                                        readOnly={isVisitor || p.photoUrl} // if they have a photo, they are a registered user, cannot rename
                                        onChange={(e) => updatePlayer(p.id, 'name', e.target.value)}
                                        placeholder={`Player Name`}
                                    />
                                    {p.photoUrl && <span className="text-[10px] text-[#00A859] font-bold px-1 uppercase block mt-1">Registered Player</span>}
                                </div>
                                {!isVisitor && (
                                    <button
                                        onClick={() => removePlayer(p.id)}
                                        className="p-2 text-[color:var(--theme-text-muted)] hover:text-red-500 rounded-full transition-colors self-start"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="pl-[52px] pr-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-semibold text-[color:var(--theme-text-muted)] uppercase tracking-wider">Skill Rating</span>
                                    <span className="text-sm font-bold text-[#00A859] bg-[color:var(--theme-green-light)] px-2 py-0.5 rounded">{p.strength}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    className={`w-full mt-1 ${isVisitor ? 'pointer-events-none opacity-50' : ''}`}
                                    value={p.strength}
                                    disabled={isVisitor}
                                    onChange={(e) => updatePlayer(p.id, 'strength', parseInt(e.target.value))}
                                    style={{ backgroundSize: `${((p.strength - 1) * 100) / 9}% 100%` }}
                                />
                                <div className="flex justify-between text-[10px] text-[color:var(--theme-text-muted)] mt-1 font-medium">
                                    <span>Novice</span>
                                    <span>Pro</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Search Modal */}
            <AnimatePresence>
                {showSearchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[color:var(--theme-surface)] w-full max-w-sm rounded-2xl shadow-xl border border-[color:var(--theme-border)] overflow-hidden"
                        >
                            <div className="p-4 border-b border-[color:var(--theme-border)] flex justify-between items-center">
                                <h3 className="font-bold text-[color:var(--theme-text-primary)]">Search Player</h3>
                                <button onClick={() => setShowSearchModal(false)} className="text-[color:var(--theme-text-muted)] hover:text-red-500"><Trash2 size={20} className="rotate-45" /></button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && searchPlayer()}
                                        placeholder="Enter unique name..."
                                        className="flex-1 bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00A859]"
                                    />
                                    <button onClick={searchPlayer} disabled={isSearching} className="bg-[#005A9C] text-white px-4 rounded-lg font-bold text-sm shadow-sm hover:bg-[#004A8C]">
                                        {isSearching ? '...' : 'Find'}
                                    </button>
                                </div>

                                {searchResult === 'not_found' && (
                                    <div className="text-center py-4 text-sm font-medium text-red-500">Player not found</div>
                                )}

                                {searchResult && searchResult !== 'not_found' && (
                                    <div className="flex items-center justify-between p-3 bg-[color:var(--theme-surface-hover)] border border-[color:var(--theme-border)] rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <img src={searchResult.photoUrl} alt="Avatar" className="w-10 h-10 rounded-full border border-[color:var(--theme-border)]" />
                                            <div>
                                                <p className="font-bold text-[color:var(--theme-text-primary)] text-sm">{searchResult.uniqueName}</p>
                                                <p className="text-[10px] text-[color:var(--theme-text-muted)]">Verified Player</p>
                                            </div>
                                        </div>
                                        <button onClick={addSearchedPlayer} className="w-8 h-8 rounded-full bg-[#00A859] text-white flex items-center justify-center shadow-md hover:bg-[#008746]"><Plus size={16} /></button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {!isVisitor && (
                <div className="fixed bottom-24 right-6 z-40 md:hidden flex flex-col gap-3">
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="w-12 h-12 bg-[#005A9C] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#004A8C] active:scale-90 transition-all"
                    >
                        <Search size={22} />
                    </button>
                    <button
                        onClick={addPlayer}
                        className="w-14 h-14 bg-[#00A859] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#008746] active:scale-90 transition-all"
                    >
                        <Plus size={28} />
                    </button>
                </div>
            )}
        </div>
    );

    const renderTeamsTab = () => (
        <div className="pb-24 space-y-6">
            <div className="material-card p-5 space-y-5">
                <div className="flex justify-between items-center border-b border-[color:var(--theme-border)] pb-4">
                    <div>
                        <h3 className="text-base font-bold text-[color:var(--theme-text-primary)]">Match Settings</h3>
                        <p className="text-xs text-[color:var(--theme-text-secondary)]">Configure team distribution</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-[color:var(--theme-text-secondary)]">Teams</span>
                        <div className={`flex items-center bg-[color:var(--theme-surface-hover)] rounded-lg p-1 border border-[color:var(--theme-border)] ${isVisitor ? 'pointer-events-none opacity-50' : ''}`}>
                            <button
                                onClick={() => setTeamCount(Math.max(2, teamCount - 1))}
                                disabled={isVisitor}
                                className="w-8 h-8 rounded shrink-0 bg-[color:var(--theme-surface)] shadow-sm flex items-center justify-center text-[color:var(--theme-text-secondary)] hover:text-[#00A859] transition-colors"
                            >
                                <Minus size={16} />
                            </button>
                            <div className="w-10 text-center">
                                <span className="text-lg font-bold text-[color:var(--theme-text-primary)] leading-none">{teamCount}</span>
                            </div>
                            <button
                                onClick={() => setTeamCount(teamCount + 1)}
                                disabled={isVisitor}
                                className="w-8 h-8 rounded shrink-0 bg-[color:var(--theme-surface)] shadow-sm flex items-center justify-center text-[color:var(--theme-text-secondary)] hover:text-[#00A859] transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {!isVisitor && (
                    <button
                        onClick={handleBalance}
                        disabled={isShuffling}
                        className={`w-full py-3.5 bg-[#00A859] hover:bg-[#008746] text-white font-bold rounded-md flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] text-base uppercase tracking-wide ${isShuffling ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        {isShuffling ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Swords size={20} />
                        )}
                        {isShuffling ? 'Processing...' : 'Balance Teams'}
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {isShuffling ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-12 gap-4"
                    >
                        <div className="relative w-16 h-16">
                            <div className="absolute inset-0 border-4 border-[color:var(--theme-green-light)] rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <span className="text-[#00A859] font-semibold text-sm animate-pulse">Analyzing player statistics...</span>
                    </motion.div>
                ) : results && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-lg font-bold text-[color:var(--theme-text-primary)] uppercase tracking-tight">Match Lineups</h3>
                            <span className="text-[10px] text-[color:var(--theme-text-muted)] font-semibold">{results.timestamp}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {results.teams.map((team, i) => (
                                <div key={team.id} className="material-card overflow-hidden">

                                    {/* Team Header */}
                                    <div className="bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)] px-4 py-3 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-6 bg-[#00A859] rounded-full"></div>
                                            <h3 className="text-base font-bold text-[color:var(--theme-text-primary)]">Team {team.id}</h3>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] uppercase font-bold text-[color:var(--theme-text-muted)] tracking-wider">Total Power</span>
                                            <span className="text-lg font-black text-[#00A859] leading-none">{team.power}</span>
                                        </div>
                                    </div>

                                    {/* Player List */}
                                    <div className="p-0">
                                        {team.players.map((p, idx) => (
                                            <div key={p.id} className="list-item px-4 py-3 flex justify-between items-center hover:bg-[color:var(--theme-surface-hover)] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-6 text-center text-xs font-bold text-[color:var(--theme-text-muted)]">{idx + 1}</div>
                                                    {p.photoUrl ? (
                                                        <img src={p.photoUrl} alt="Avi" className="w-8 h-8 rounded-full border border-[color:var(--theme-border)] object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-[color:var(--theme-blue-light)] flex items-center justify-center">
                                                            <span className="text-[#005A9C] font-bold text-xs">
                                                                {(p.name || `P${p.id.toString().slice(-2)}`).substring(0, 2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-[color:var(--theme-text-primary)] text-sm">
                                                        {p.name || `Player ${p.id.toString().slice(-3)}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="text-xs font-bold text-[color:var(--theme-text-secondary)] bg-[color:var(--theme-surface-hover)] px-2 py-1 rounded w-8 text-center">{p.strength}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="pb-24 space-y-6">

            {/* User Profile Summary */}
            <div className="material-card overflow-hidden">
                <div className="bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)] px-5 py-4 flex justify-between items-center">
                    <h2 className="text-base font-bold text-[color:var(--theme-text-primary)] flex items-center gap-2">
                        <User size={18} className="text-[#00A859]" />
                        Account
                    </h2>
                    <button onClick={handleLogout} className="text-xs font-bold text-red-500 uppercase">Log Out</button>
                </div>
                <div className="p-5 flex items-center gap-4">
                    <img src={userProfile?.photoUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-[color:var(--theme-border)] shadow-sm object-cover" />
                    <div>
                        <p className="font-bold text-lg text-[color:var(--theme-text-primary)]">{userProfile?.uniqueName || "Guest User"}</p>
                        <button onClick={() => navigate(`/profile/${userProfile?.uniqueName}`)} className="text-xs text-[#005A9C] font-bold uppercase mt-1">View Public Profile</button>
                    </div>
                </div>
            </div>

            {/* Theme Settings */}
            <div className="material-card overflow-hidden">
                <div className="bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)] px-5 py-4">
                    <h2 className="text-base font-bold text-[color:var(--theme-text-primary)] flex items-center gap-2">
                        {isDarkMode ? <Moon size={18} className="text-[#00A859]" /> : <Sun size={18} className="text-[#00A859]" />}
                        App Appearance
                    </h2>
                </div>
                <div className="p-5 flex justify-between items-center">
                    <div className="space-y-1">
                        <span className="font-bold text-[color:var(--theme-text-primary)] block text-sm">Dark Mode</span>
                        <span className="text-[10px] text-[color:var(--theme-text-muted)]">Toggle between light and dark themes</span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${isDarkMode ? 'bg-[#00A859]' : 'bg-[color:var(--theme-border)]'}`}
                    >
                        <motion.div
                            layout
                            className="w-4 h-4 bg-white rounded-full shadow-sm"
                            animate={{ x: isDarkMode ? 24 : 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
                </div>
            </div>

            {/* Share Section */}
            <div className="material-card overflow-hidden">
                <div className="bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)] px-5 py-4">
                    <h2 className="text-base font-bold text-[color:var(--theme-text-primary)] flex items-center gap-2">
                        <Share2 size={18} className="text-[#005A9C]" />
                        Share Lineup
                    </h2>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-[color:var(--theme-text-secondary)] text-xs font-medium">Invite others to view the match lineups or collaborate on team balancing.</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => generateShareLink('visitor')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-[color:var(--theme-surface)] border border-[color:var(--theme-border)] hover:bg-[color:var(--theme-surface-hover)] transition-colors shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[color:var(--theme-blue-light)] text-[#005A9C] rounded-lg">
                                    <Users size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-[color:var(--theme-text-primary)] text-sm">Viewer Link</div>
                                    <div className="text-[10px] text-[color:var(--theme-text-muted)] font-medium">Read-only access</div>
                                </div>
                            </div>
                            {copied === 'visitor' ? <Check size={18} className="text-[#00A859]" /> : <span className="text-xs font-bold text-[#005A9C] uppercase tracking-wide">Copy</span>}
                        </button>

                        <button
                            onClick={() => generateShareLink('moderator')}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-[color:var(--theme-surface)] border border-[color:var(--theme-border)] hover:bg-[color:var(--theme-surface-hover)] transition-colors shadow-sm"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[color:var(--theme-green-light)] text-[#00A859] rounded-lg">
                                    <Save size={18} />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-[color:var(--theme-text-primary)] text-sm">Editor Link</div>
                                    <div className="text-[10px] text-[color:var(--theme-text-muted)] font-medium">Full access to edit players</div>
                                </div>
                            </div>
                            {copied === 'moderator' ? <Check size={18} className="text-[#00A859]" /> : <span className="text-xs font-bold text-[#00A859] uppercase tracking-wide">Copy</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* History Section */}
            <div className="material-card overflow-hidden">
                <div className="bg-[color:var(--theme-surface-hover)] border-b border-[color:var(--theme-border)] px-5 py-4 flex justify-between items-center">
                    <h2 className="text-base font-bold text-[color:var(--theme-text-primary)] flex items-center gap-2">
                        <Clock size={18} className="text-[color:var(--theme-text-secondary)]" />
                        Recent Activity
                    </h2>
                    {history.length > 0 && (
                        <button
                            onClick={() => { setHistory([]); localStorage.removeItem('team_balancer_history'); }}
                            className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                <div className="p-0">
                    {history.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 bg-[color:var(--theme-surface-hover)] rounded-full flex items-center justify-center">
                                <Clock size={24} className="text-[color:var(--theme-text-muted)]" />
                            </div>
                            <span className="text-[color:var(--theme-text-muted)] text-sm font-medium">No recent teams generated.</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-[color:var(--theme-border)]">
                            {history.map((h, i) => (
                                <div key={h.id} className="p-4 flex items-start gap-3 hover:bg-[color:var(--theme-surface-hover)] transition-colors">
                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#00A859] shrink-0"></div>
                                    <span className="text-[color:var(--theme-text-secondary)] text-sm font-medium leading-snug">{h.log}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`min-h-screen bg-[color:var(--theme-bg)] text-[color:var(--theme-text-primary)] flex flex-col font-sans transition-colors duration-200 ${isDarkMode ? 'dark' : ''}`}>
            {/* App Header */}
            <header className="sticky top-0 z-40 bg-[color:var(--theme-surface)] border-b border-[color:var(--theme-border)] shadow-sm pt-safe-top transition-colors duration-200">
                <div className="max-w-md md:max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#00A859] flex items-center justify-center shadow-sm cursor-pointer" onClick={() => navigate('/profile/' + userProfile?.uniqueName)}>
                            {userProfile?.photoUrl ? (
                                <img src={userProfile.photoUrl} alt="Me" className="w-full h-full rounded object-cover" />
                            ) : (
                                <Swords size={18} className="text-white" />
                            )}
                        </div>
                        <h1 className="text-lg font-black tracking-tight text-[color:var(--theme-text-primary)] uppercase">
                            Team<span className="text-[#00A859]">Balancer</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        {isVisitor && (
                            <span className="text-[9px] uppercase tracking-widest font-bold bg-[color:var(--theme-blue-light)] text-[#005A9C] px-2 py-1 rounded">
                                Viewer
                            </span>
                        )}
                        <button onClick={toggleDarkMode} className="text-[color:var(--theme-text-muted)] hover:text-[#00A859] transition-colors block md:hidden">
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button className="text-[color:var(--theme-text-muted)] hover:text-[color:var(--theme-text-secondary)] transition-colors hidden md:block">
                            <HelpCircle size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden max-w-md md:max-w-3xl w-full mx-auto p-4 transition-colors duration-200">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'players' && renderPlayersTab()}
                        {activeTab === 'teams' && renderTeamsTab()}
                        {activeTab === 'settings' && renderSettingsTab()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[color:var(--theme-surface)] border-t border-[color:var(--theme-border)] pb-safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-colors duration-200">
                <div className="max-w-md md:max-w-3xl mx-auto flex justify-between items-center px-2">

                    <button
                        onClick={() => setActiveTab('players')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
                    >
                        {activeTab === 'players' && <div className="absolute top-0 w-8 h-1 bg-[#00A859] rounded-b-md"></div>}
                        <Users size={24} className={activeTab === 'players' ? 'text-[#00A859] fill-[color:var(--theme-green-light)]' : 'text-[color:var(--theme-text-muted)] hover:text-[color:var(--theme-text-secondary)]'} />
                        <span className={`text-[10px] font-bold ${activeTab === 'players' ? 'text-[#00A859]' : 'text-[color:var(--theme-text-muted)]'}`}>Players</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('teams')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
                    >
                        {activeTab === 'teams' && <div className="absolute top-0 w-8 h-1 bg-[#00A859] rounded-b-md"></div>}
                        <div className="relative">
                            <Swords size={24} className={activeTab === 'teams' ? 'text-[#00A859] fill-[color:var(--theme-green-light)]' : 'text-[color:var(--theme-text-muted)] hover:text-[color:var(--theme-text-secondary)]'} />
                            {results && activeTab !== 'teams' && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00A859] border-2 border-[color:var(--theme-surface)] rounded-full"></span>
                            )}
                        </div>
                        <span className={`text-[10px] font-bold ${activeTab === 'teams' ? 'text-[#00A859]' : 'text-[color:var(--theme-text-muted)]'}`}>Match</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
                    >
                        {activeTab === 'settings' && <div className="absolute top-0 w-8 h-1 bg-[#00A859] rounded-b-md"></div>}
                        <Settings size={24} className={activeTab === 'settings' ? 'text-[#00A859] fill-[color:var(--theme-green-light)]' : 'text-[color:var(--theme-text-muted)] hover:text-[color:var(--theme-text-secondary)]'} />
                        <span className={`text-[10px] font-bold ${activeTab === 'settings' ? 'text-[#00A859]' : 'text-[color:var(--theme-text-muted)]'}`}>More</span>
                    </button>

                </div>
            </nav>
        </div>
    );
}
