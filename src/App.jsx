import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Swords, Share2, History, Trash2,
  Plus, Minus, Save, Check, Clock, Settings, UserPlus, HelpCircle
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
    eventLog: `Balanced formation created on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
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

  const isVisitor = userRole === 'visitor';

  // Content rendering based on tab
  const renderPlayersTab = () => (
    <div className="pb-24 space-y-4 relative">
      <div className="flex justify-between items-center mb-4 px-1">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Squad Members</h2>
          <p className="text-xs text-gray-500 font-medium">Total: {players.length} Players</p>
        </div>
        {!isVisitor && (
          <button
            onClick={addPlayer}
            className="flex items-center gap-1 px-4 py-2 bg-[#e6f6ee] text-[#00A859] rounded-md font-bold hover:bg-[#cbf0db] transition-colors shadow-sm text-sm"
          >
            <UserPlus size={16} /> ADD PLAYER
          </button>
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
              className="material-card p-4 relative group bg-white flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex flex-shrink-0 items-center justify-center font-bold text-gray-500 shadow-sm border border-gray-200">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <input
                    className={`w-full bg-transparent border-b border-gray-200 focus:border-[#00A859] px-1 py-1 outline-none transition-colors font-semibold text-gray-800 text-lg placeholder:text-gray-400 placeholder:font-normal ${isVisitor ? 'pointer-events-none' : ''}`}
                    value={p.name}
                    readOnly={isVisitor}
                    onChange={(e) => updatePlayer(p.id, 'name', e.target.value)}
                    placeholder={`Player Name`}
                  />
                </div>
                {!isVisitor && (
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors self-start"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="pl-[52px] pr-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Skill Rating</span>
                  <span className="text-sm font-bold text-[#00A859] bg-[#e6f6ee] px-2 py-0.5 rounded">{p.strength}</span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  className={`w-full mt-1 ${isVisitor ? 'pointer-events-none opacity-50' : ''}`}
                  value={p.strength}
                  disabled={isVisitor}
                  onChange={(e) => updatePlayer(p.id, 'strength', parseInt(e.target.value))}
                  style={{ backgroundSize: `${((p.strength - 1) * 100) / 9}% 100%` }}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 font-medium">
                  <span>Novice</span>
                  <span>Pro</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!isVisitor && (
        <div className="fixed bottom-24 right-6 z-40 md:hidden">
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
      <div className="material-card p-5 bg-white space-y-5">

        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-800">Match Settings</h3>
            <p className="text-xs text-gray-500">Configure team distribution</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-600">Teams</span>
            <div className={`flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 ${isVisitor ? 'pointer-events-none opacity-50' : ''}`}>
              <button
                onClick={() => setTeamCount(Math.max(2, teamCount - 1))}
                disabled={isVisitor}
                className="w-8 h-8 rounded shrink-0 bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-[#00A859] transition-colors active:bg-gray-100"
              >
                <Minus size={16} />
              </button>
              <div className="w-10 text-center">
                <span className="text-lg font-bold text-gray-800 leading-none">{teamCount}</span>
              </div>
              <button
                onClick={() => setTeamCount(teamCount + 1)}
                disabled={isVisitor}
                className="w-8 h-8 rounded shrink-0 bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-[#00A859] transition-colors active:bg-gray-100"
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
              <div className="absolute inset-0 border-4 border-[#e6f6ee] rounded-full"></div>
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
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-tight">Match Lineups</h3>
              <span className="text-[10px] text-gray-400 font-semibold">{results.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.teams.map((team, i) => (
                <div key={team.id} className="material-card overflow-hidden bg-white">

                  {/* Team Header */}
                  <div className="bg-[#f8f9fa] border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-[#00A859] rounded-full"></div>
                      <h3 className="text-base font-bold text-gray-800">Team {team.id}</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Total Power</span>
                      <span className="text-lg font-black text-[#00A859] leading-none">{team.power}</span>
                    </div>
                  </div>

                  {/* Player List */}
                  <div className="p-0">
                    {team.players.map((p, idx) => (
                      <div key={p.id} className="list-item px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 text-center text-xs font-bold text-gray-400">{idx + 1}</div>
                          <div className="w-8 h-8 rounded-full bg-[#e6eff5] flex items-center justify-center">
                            <span className="text-[#005A9C] font-bold text-xs">
                              {(p.name || `P${p.id.toString().slice(-2)}`).substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-800 text-sm">
                            {p.name || `Player ${p.id.toString().slice(-3)}`}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-8 text-center">{p.strength}</span>
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

      {/* Share Section */}
      <div className="material-card bg-white overflow-hidden">
        <div className="bg-[#f8f9fa] border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Share2 size={18} className="text-[#005A9C]" />
            Share Lineup
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-500 text-xs font-medium">Invite others to view the match lineups or collaborate on team balancing.</p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => generateShareLink('visitor')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-white border border-[#e5e7eb] hover:bg-gray-50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#e6eff5] text-[#005A9C] rounded-lg">
                  <Users size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800 text-sm">Viewer Link</div>
                  <div className="text-[10px] text-gray-500 font-medium">Read-only access</div>
                </div>
              </div>
              {copied === 'visitor' ? <Check size={18} className="text-[#00A859]" /> : <span className="text-xs font-bold text-[#005A9C] uppercase tracking-wide">Copy</span>}
            </button>

            <button
              onClick={() => generateShareLink('moderator')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-white border border-[#e5e7eb] hover:bg-gray-50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#e6f6ee] text-[#00A859] rounded-lg">
                  <Save size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-gray-800 text-sm">Editor Link</div>
                  <div className="text-[10px] text-gray-500 font-medium">Full access to edit players</div>
                </div>
              </div>
              {copied === 'moderator' ? <Check size={18} className="text-[#00A859]" /> : <span className="text-xs font-bold text-[#00A859] uppercase tracking-wide">Copy</span>}
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="material-card bg-white overflow-hidden">
        <div className="bg-[#f8f9fa] border-b border-gray-200 px-5 py-4 flex justify-between items-center">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-gray-600" />
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
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-gray-300" />
              </div>
              <span className="text-gray-400 text-sm font-medium">No recent teams generated.</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((h, i) => (
                <div key={h.id} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#00A859] shrink-0"></div>
                  <span className="text-gray-600 text-sm font-medium leading-snug">{h.log}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-800 flex flex-col font-sans">
      {/* App Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm pt-safe-top">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-[#00A859] flex items-center justify-center shadow-sm">
              <Swords size={18} className="text-white" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
              Team<span className="text-[#00A859]">Balancer</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {isVisitor && (
              <span className="text-[9px] uppercase tracking-widest font-bold bg-[#e6eff5] text-[#005A9C] px-2 py-1 rounded">
                Viewer
              </span>
            )}
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <HelpCircle size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden max-w-md md:max-w-3xl w-full mx-auto p-4">
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-md md:max-w-3xl mx-auto flex justify-between items-center px-2">

          <button
            onClick={() => setActiveTab('players')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
          >
            {activeTab === 'players' && <div className="absolute top-0 w-8 h-1bg-[#00A859] rounded-b-md"></div>}
            <Users size={24} className={activeTab === 'players' ? 'text-[#00A859] fill-[#e6f6ee]' : 'text-gray-400 hover:text-gray-500'} />
            <span className={`text-[10px] font-bold ${activeTab === 'players' ? 'text-[#00A859]' : 'text-gray-400'}`}>Players</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
          >
            {activeTab === 'teams' && <div className="absolute top-0 w-8 h-1 bg-[#00A859] rounded-b-md"></div>}
            <div className="relative">
              <Swords size={24} className={activeTab === 'teams' ? 'text-[#00A859] fill-[#e6f6ee]' : 'text-gray-400 hover:text-gray-500'} />
              {results && activeTab !== 'teams' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00A859] border-2 border-white rounded-full"></span>
              )}
            </div>
            <span className={`text-[10px] font-bold ${activeTab === 'teams' ? 'text-[#00A859]' : 'text-gray-400'}`}>Match</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors relative"
          >
            {activeTab === 'settings' && <div className="absolute top-0 w-8 h-1 bg-[#00A859] rounded-b-md"></div>}
            <Settings size={24} className={activeTab === 'settings' ? 'text-[#00A859] fill-[#e6f6ee]' : 'text-gray-400 hover:text-gray-500'} />
            <span className={`text-[10px] font-bold ${activeTab === 'settings' ? 'text-[#00A859]' : 'text-gray-400'}`}>More</span>
          </button>

        </div>
      </nav>
    </div>
  );
}
