import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Swords, Share2, History, Trash2,
  ChevronRight, ChevronLeft, Plus, Minus,
  Save, Copy, Check, Clock, Settings, UserPlus
} from 'lucide-react';
import LZString from 'lz-string';

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
    eventLog: `Team formed at ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}`
  };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('players'); // 'players', 'teams', 'settings'
  const [teamCount, setTeamCount] = useState(2);
  const [players, setPlayers] = useState(
    Array.from({ length: 4 }).map((_, i) => ({
      id: Date.now() + i,
      name: "",
      strength: 5,
    }))
  );
  const [history, setHistory] = useState([]);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [userRole, setUserRole] = useState('moderator');

  useEffect(() => {
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
    }

    const savedHistory = localStorage.getItem('team_balancer_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

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
    }, 1200);
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

  const isVisitor = userRole === 'visitor';

  // Content rendering based on tab
  const renderPlayersTab = () => (
    <div className="pb-24 space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Players ({players.length})</h2>
        {!isVisitor && (
          <button
            onClick={addPlayer}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 text-blue-400 rounded-full font-semibold hover:bg-blue-600/30 transition-colors shadow-lg shadow-blue-500/10 active:scale-95 border border-blue-500/20"
          >
            <UserPlus size={18} /> Add
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {players.map((p, idx) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-container p-5 relative group"
            >
              {!isVisitor && (
                <button
                  onClick={() => removePlayer(p.id)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg text-sm">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-semibold text-white/50">Player Info</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-xs font-bold text-indigo-300">Rating: {p.strength}</span>
                </div>
              </div>

              <div className="space-y-4">
                <input
                  className={`w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 focus:border-indigo-500/50 focus:bg-black/40 outline-none transition-all font-bold placeholder:text-white/20 text-lg shadow-inner ${isVisitor ? 'pointer-events-none opacity-60' : ''}`}
                  value={p.name}
                  readOnly={isVisitor}
                  onChange={(e) => updatePlayer(p.id, 'name', e.target.value)}
                  placeholder={`Player ${idx + 1}`}
                />

                <div className="pt-2">
                  <input
                    type="range" min="1" max="10" step="1"
                    className={`w-full accent-indigo-500 ${isVisitor ? 'pointer-events-none opacity-30' : ''}`}
                    value={p.strength}
                    disabled={isVisitor}
                    onChange={(e) => updatePlayer(p.id, 'strength', parseInt(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-white/30 px-1 mt-1 font-medium">
                    <span>Beginner (1)</span>
                    <span>Pro (10)</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderTeamsTab = () => (
    <div className="pb-24 space-y-8">
      <div className="glass-container p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 z-0"></div>

        <div className="space-y-3 z-10 w-full md:w-auto flex flex-col items-center md:items-start">
          <span className="text-sm text-indigo-300 font-bold uppercase tracking-wider block">Formation Setup</span>
          <div className={`flex items-center gap-6 ${isVisitor ? 'pointer-events-none opacity-50' : ''}`}>
            <button
              onClick={() => setTeamCount(Math.max(2, teamCount - 1))}
              disabled={isVisitor}
              className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 flex items-center justify-center transition-all shadow-lg active:scale-90"
            >
              <Minus size={20} className="text-white/80" />
            </button>
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className="text-5xl font-black text-white leading-none drop-shadow-md">{teamCount}</span>
            </div>
            <button
              onClick={() => setTeamCount(teamCount + 1)}
              disabled={isVisitor}
              className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 flex items-center justify-center transition-all shadow-lg active:scale-90"
            >
              <Plus size={20} className="text-white/80" />
            </button>
          </div>
        </div>

        {!isVisitor && (
          <button
            onClick={handleBalance}
            disabled={isShuffling}
            className={`w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/25 transition-all active:scale-95 text-lg z-10 ${isShuffling ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'}`}
          >
            <Swords size={24} className={isShuffling ? 'animate-spin' : ''} />
            {isShuffling ? 'Balancing...' : 'Generate Teams'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isShuffling ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="h-64 flex flex-col items-center justify-center gap-6 glass-container border-indigo-500/20"
          >
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Swords size={24} className="text-indigo-400 animate-pulse" />
              </div>
            </div>
            <span className="text-indigo-300 font-bold tracking-widest uppercase text-sm animate-pulse">Computing Matrix...</span>
          </motion.div>
        ) : results && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-bold text-white/90">Results</h3>
              <span className="text-xs text-white/40 font-medium bg-black/20 px-3 py-1 rounded-full">{results.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {results.teams.map((team, i) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={team.id}
                  className={`glass-container team-${(i % 4) + 1} overflow-hidden`}
                >
                  <div className="bg-black/20 p-5 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg bg-white/10 text-team-${(i % 4) + 1}-color`}>
                        {team.id}
                      </div>
                      <h3 className="text-xl font-bold text-white/90">Squad {team.id}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Power</div>
                      <div className={`text-2xl font-black text-team-${(i % 4) + 1}-color bg-white/5 px-3 py-1 rounded-lg`}>{team.power}</div>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    {team.players.map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5 hover:bg-white/[0.05] transition-colors group">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/20 font-bold w-4">{idx + 1}.</span>
                          <span className="font-semibold text-white/80 group-hover:text-white transition-colors">
                            {p.name || `Player ${p.id.toString().slice(-3)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                          <span className="text-white/40 text-[10px] font-bold uppercase">Rtg</span>
                          <span className="text-white/80 text-sm font-bold">{p.strength}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="pb-24 space-y-8">
      <div className="glass-container p-6 space-y-6">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-pink-400 flex items-center gap-2">
          <Share2 className="text-orange-400" /> Share Formation
        </h2>
        <p className="text-white/50 text-sm">Generate a link to share the current players and generated teams with others.</p>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => generateShareLink('visitor')}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white hover:bg-white/[0.07] transition-all font-bold text-sm active:scale-95 shadow-lg relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            {copied === 'visitor' ? <Check size={18} className="text-blue-400 relative z-10" /> : <Users size={18} className="text-blue-400 relative z-10" />}
            <span className="relative z-10">{copied === 'visitor' ? "Viewer Link Copied!" : "Copy Viewer Link"}</span>
          </button>
          <button
            onClick={() => generateShareLink('moderator')}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-white/[0.03] border border-white/10 text-white hover:bg-white/[0.07] transition-all font-bold text-sm active:scale-95 shadow-lg relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-orange-500/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            {copied === 'moderator' ? <Check size={18} className="text-orange-400 relative z-10" /> : <Save size={18} className="text-orange-400 relative z-10" />}
            <span className="relative z-10">{copied === 'moderator' ? "Editor Link Copied!" : "Copy Editor Link"}</span>
          </button>
        </div>
      </div>

      <div className="glass-container p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white/90 flex items-center gap-2">
            <Clock className="text-indigo-400" /> History
          </h2>
          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); localStorage.removeItem('team_balancer_history'); }}
              className="text-xs font-bold text-red-400/70 hover:text-red-400 bg-red-400/10 px-3 py-1 rounded-full transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-white/30 font-medium text-sm">
            No history available yet. Generate some teams!
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={h.id} className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500/50"></div>
                <span className="text-white/70 text-sm font-medium">{h.log}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-dark text-white selection:bg-indigo-500/30 flex flex-col font-sans">
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-bg-dark/80 backdrop-blur-xl border-b border-white/5 pt-safe-top">
        <div className="max-w-md md:max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Swords size={16} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Team<span className="text-indigo-400">Balancer</span>
            </h1>
          </div>
          {isVisitor && (
            <span className="text-[10px] uppercase tracking-widest font-bold bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md border border-orange-500/20">
              Viewer
            </span>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden max-w-md md:max-w-3xl w-full mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'players' && renderPlayersTab()}
            {activeTab === 'teams' && renderTeamsTab()}
            {activeTab === 'settings' && renderSettingsTab()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-dark/90 backdrop-blur-2xl border-t border-white/10 pb-safe-bottom">
        <div className="max-w-md md:max-w-3xl mx-auto flex justify-around items-center p-2 px-6">
          <button
            onClick={() => setActiveTab('players')}
            className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${activeTab === 'players' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'players' ? 'bg-indigo-500/10' : ''}`}>
              <Users size={22} className={activeTab === 'players' ? 'fill-indigo-400/20' : ''} />
            </div>
            <span className="text-[10px] font-bold">Players</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${activeTab === 'teams' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'teams' ? 'bg-indigo-500/10' : ''}`}>
              <Swords size={22} className={activeTab === 'teams' ? 'fill-indigo-400/20' : ''} />
            </div>
            <span className="text-[10px] font-bold">Teams</span>
            {results && activeTab !== 'teams' && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 p-2 w-20 transition-colors ${activeTab === 'settings' ? 'text-indigo-400' : 'text-white/40 hover:text-white/70'}`}
          >
            <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-500/10' : ''}`}>
              <Settings size={22} className={activeTab === 'settings' ? 'fill-indigo-400/20' : ''} />
            </div>
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
