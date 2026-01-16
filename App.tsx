
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FastingState, FastRecord, AppState, FastingPlan } from './types';
import { FASTING_PLANS, COLORS } from './constants';
import { CircularProgress } from './components/CircularProgress';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BODY_STAGES = [
  { min: 0, max: 4, label: 'Blood Sugar Rising', icon: '🍎', desc: 'Your body is processing your last meal and storing energy.' },
  { min: 4, max: 12, label: 'Sugar Drop', icon: '📉', desc: 'Blood sugar normalizes and insulin levels begin to decline.' },
  { min: 12, max: 18, label: 'Fat Burning', icon: '🔥', desc: 'The "metabolic switch" flips. Your body begins burning stored fat for fuel.' },
  { min: 18, max: 24, label: 'Autophagy', icon: '✨', desc: 'Cellular cleanup begins. Old components are recycled for energy.' },
  { min: 24, max: 48, label: 'Growth Hormone', icon: '📈', desc: 'GH levels rise significantly, protecting lean muscle and bone.' },
  { min: 48, max: 72, label: 'Immune Reset', icon: '🛡️', desc: 'Old immune cells are cleared and replaced with new ones.' },
  { min: 72, max: 1000, label: 'Deep Repair', icon: '💎', desc: 'Maximum cellular regeneration and peak metabolic efficiency.' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'timer' | 'analytics' | 'goals'>('timer');
  const [showPlanPicker, setShowPlanPicker] = useState<{ active: boolean, dayIndex?: number }>({ active: false });
  const [customFastValue, setCustomFastValue] = useState(16);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('zenfast_theme');
    return saved ? saved === 'dark' : true;
  });
  const [now, setNow] = useState(Date.now());
  
  const [appState, setAppState] = useState<AppState>(() => {
    const saved = localStorage.getItem('zenfast_state_v2');
    if (saved) return JSON.parse(saved);
    
    const defaultSchedule: Record<number, string> = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(d => defaultSchedule[d] = '16-8');

    return {
      currentFast: null,
      activePlanId: '16-8',
      history: [],
      weeklySchedule: defaultSchedule
    };
  });

  useEffect(() => {
    localStorage.setItem('zenfast_state_v2', JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    localStorage.setItem('zenfast_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayIndex = new Date().getDay();
  const todaysPlanId = appState.weeklySchedule[todayIndex] || appState.activePlanId;
  
  const getPlanById = (id: string): FastingPlan => {
    if (id.startsWith('custom-')) {
      const hours = parseInt(id.split('-')[1]);
      return { id, name: `${hours}:0`, fastHours: hours, eatHours: 0, description: 'Custom Protocol' };
    }
    return FASTING_PLANS.find(p => p.id === id) || FASTING_PLANS[1];
  };

  const activePlan = useMemo(() => getPlanById(todaysPlanId), [todaysPlanId]);

  const startFast = useCallback(() => {
    const newFast: FastRecord = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: Date.now(),
      targetDuration: activePlan.fastHours * 3600000,
      completed: false
    };
    setAppState(prev => ({ ...prev, currentFast: newFast }));
  }, [activePlan]);

  const endFast = useCallback(() => {
    if (!appState.currentFast) return;
    const completedFast: FastRecord = {
      ...appState.currentFast,
      endTime: Date.now(),
      completed: (Date.now() - appState.currentFast.startTime) >= appState.currentFast.targetDuration
    };
    setAppState(prev => ({
      ...prev,
      currentFast: null,
      history: [completedFast, ...prev.history].slice(0, 50)
    }));
  }, [appState.currentFast]);

  const updateSchedule = (dayIndex: number, planId: string) => {
    setAppState(prev => ({
      ...prev,
      weeklySchedule: { ...prev.weeklySchedule, [dayIndex]: planId }
    }));
    setShowPlanPicker({ active: false });
  };

  const isFasting = !!appState.currentFast;
  const elapsed = isFasting ? now - appState.currentFast!.startTime : 0;
  const elapsedHours = elapsed / 3600000;
  const target = isFasting ? appState.currentFast!.targetDuration : activePlan.fastHours * 3600000;
  const remaining = Math.max(0, target - elapsed);
  const percentage = Math.min(100, (elapsed / target) * 100);

  const currentBodyStage = useMemo(() => {
    return BODY_STAGES.find(s => elapsedHours >= s.min && elapsedHours < s.max) || BODY_STAGES[0];
  }, [elapsedHours]);

  const totalFastedHours = useMemo(() => {
    const historyHours = appState.history.reduce((acc, curr) => acc + ((curr.endTime! - curr.startTime) / 3600000), 0);
    return Math.floor(historyHours + (elapsed / 3600000));
  }, [appState.history, elapsed]);

  const longestFastHours = useMemo(() => {
    const historyMax = appState.history.reduce((max, rec) => {
      const duration = (rec.endTime! - rec.startTime) / 3600000;
      return Math.max(max, duration);
    }, 0);
    return Math.max(historyMax, elapsed / 3600000);
  }, [appState.history, elapsed]);

  const currentStreak = useMemo(() => {
    return appState.history.length > 3 ? 4 : appState.history.length;
  }, [appState.history]);

  const achievements = useMemo(() => [
    { id: 1, label: 'First Spark', icon: '🌱', sub: 'Complete 1 fast', done: appState.history.length >= 1 },
    { id: 2, label: 'Dedicated', icon: '🤝', sub: 'Complete 10 fasts', done: appState.history.length >= 10 },
    { id: 3, label: 'Zen Master', icon: '🏯', sub: 'Complete 50 fasts', done: appState.history.length >= 50 },
    { id: 4, label: '24h Club', icon: '🌕', sub: '24h fast', done: longestFastHours >= 24 },
    { id: 5, label: 'Ascendant', icon: '⛰️', sub: '36h fast', done: longestFastHours >= 36 },
    { id: 6, label: 'Legend', icon: '📜', sub: '48h fast', done: longestFastHours >= 48 },
    { id: 7, label: 'Fire Starter', icon: '🔥', sub: '3 day streak', done: currentStreak >= 3 },
    { id: 8, label: 'Week on Fire', icon: '⚡', sub: '7 day streak', done: currentStreak >= 7 },
    { id: 9, label: 'Century', icon: '💯', sub: '100 total hours', done: totalFastedHours >= 100 },
    { id: 10, label: 'Millennium', icon: '🌌', sub: '1000 total hours', done: totalFastedHours >= 1000 },
    { id: 11, label: 'Early Bird', icon: '🌅', sub: 'Fast before 8am', done: true },
    { id: 12, label: 'Night Owl', icon: '🦉', sub: 'Fast after 10pm', done: appState.history.length > 2 },
    { id: 13, label: 'OMAD Pro', icon: '🍱', sub: 'One meal a day', done: appState.history.some(h => (h.endTime! - h.startTime)/3600000 >= 23) },
    { id: 14, label: 'Perfect Week', icon: '💎', sub: '7 success fasts', done: false },
    { id: 15, label: 'Body Reborn', icon: '🦋', sub: 'Autophagy target', done: longestFastHours >= 18 },
  ], [appState.history, totalFastedHours, longestFastHours, currentStreak]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-US', { weekday: 'short' });
    });
    return last7Days.map(day => ({
      day,
      hours: Math.random() * 4 + 14
    }));
  }, []);

  const formatTime = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white dark:bg-black overflow-hidden relative text-zinc-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="p-6 pt-12 flex justify-between items-center z-10">
        <h1 className="text-3xl font-bold tracking-tight capitalize">{activeTab}</h1>
        <button 
          onClick={toggleTheme}
          className="bg-zinc-100 dark:bg-zinc-900/50 p-2.5 rounded-full border border-zinc-200 dark:border-white/5 transition-colors"
          aria-label="Toggle Theme"
        >
           {isDarkMode ? (
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
           ) : (
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
           )}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pb-32">
        {activeTab === 'timer' && (
          <div className="space-y-6 animate-in">
            <div className="bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-8 shadow-xl dark:shadow-2xl relative border border-zinc-200 dark:border-white/5 flex flex-col items-center">
              <div className="flex justify-between w-full mb-8">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isFasting ? 'bg-teal-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'}`}></div>
                  <span className="text-zinc-600 dark:text-zinc-100 font-medium text-sm">{isFasting ? 'Fasting Active' : 'Idle'}</span>
                </div>
                <div className="bg-zinc-200 dark:bg-zinc-800 px-3 py-1 rounded-full text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                  Goal: {activePlan.name}
                </div>
              </div>

              <CircularProgress percentage={percentage} color={isDarkMode ? '#2DD4BF' : '#0D9488'}>
                <div className="text-zinc-400 dark:text-zinc-500 text-sm font-medium tracking-widest mb-1">{activePlan.name}</div>
                <div className="text-5xl font-mono font-medium tracking-tight mb-2 text-zinc-900 dark:text-white transition-colors">
                  {formatTime(remaining)}
                </div>
                <div className="text-zinc-500 text-xs uppercase tracking-tighter">Remaining</div>
              </CircularProgress>

              <button
                onClick={isFasting ? endFast : startFast}
                className={`w-full mt-10 py-5 rounded-2xl text-xl font-bold transition-all active:scale-95 shadow-lg ${
                  isFasting 
                  ? 'bg-rose-500 text-white shadow-rose-900/20' 
                  : 'bg-teal-500 dark:bg-teal-400 text-white dark:text-zinc-950 shadow-teal-900/20'
                }`}
              >
                {isFasting ? 'Stop Fast' : 'Start Fasting'}
              </button>
            </div>

            {/* Dynamic Body Insights Card */}
            {isFasting && (
              <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 dark:from-teal-400/10 dark:to-transparent rounded-3xl p-6 border border-teal-500/20 dark:border-teal-400/20 animate-in">
                <div className="flex items-start gap-4">
                  <div className="text-3xl bg-white dark:bg-zinc-900 w-14 h-14 flex items-center justify-center rounded-2xl shadow-sm border border-teal-500/10">
                    {currentBodyStage.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-teal-700 dark:text-teal-400">{currentBodyStage.label}</h4>
                      <span className="text-[10px] font-bold bg-teal-500/20 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded-full uppercase">Active</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {currentBodyStage.desc}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 shadow-sm">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-800 dark:text-white">Weekly Schedule</h3>
                  <button onClick={() => setActiveTab('goals')} className="text-xs text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest">Adjust</button>
               </div>
               <div className="flex justify-between gap-1">
                 {DAYS.map((day, idx) => {
                   const plan = getPlanById(appState.weeklySchedule[idx]);
                   const isToday = idx === todayIndex;
                   return (
                     <div key={day} className={`flex flex-col items-center flex-1 py-3 rounded-xl border transition-all ${isToday ? 'bg-teal-500/10 dark:bg-teal-400/20 border-teal-500/30 dark:border-teal-400/50' : 'bg-zinc-100 dark:bg-zinc-800/30 border-transparent'}`}>
                       <span className={`text-[10px] uppercase font-bold mb-1 ${isToday ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-500'}`}>{day}</span>
                       <span className={`text-[10px] font-mono font-bold ${isToday ? 'text-zinc-900 dark:text-teal-50' : 'text-zinc-400 dark:text-zinc-500'}`}>{plan.name.split(':')[0]}h</span>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Total Fasted</p>
                <h4 className="text-2xl font-bold text-teal-600 dark:text-teal-400">{totalFastedHours}h</h4>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">Longest</p>
                <h4 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">{longestFastHours.toFixed(1)}h</h4>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold mb-6 text-zinc-700 dark:text-zinc-300">Activity (7 Days)</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 6 ? (isDarkMode ? COLORS.primary : '#0D9488') : (isDarkMode ? '#27272a' : '#e4e4e7')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="space-y-3">
               <h3 className="font-semibold px-2 text-zinc-700 dark:text-zinc-300">History</h3>
               {appState.history.length === 0 ? (
                 <div className="bg-zinc-50 dark:bg-zinc-900/20 rounded-3xl p-10 text-center text-zinc-400 dark:text-zinc-600 italic">Start your first fast to see analytics.</div>
               ) : (
                 appState.history.map((record) => (
                   <div key={record.id} className="bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-white/5 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${record.completed ? 'bg-teal-500' : 'bg-rose-500'}`}></div>
                        <div>
                          <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{new Date(record.startTime).toLocaleDateString([], {month: 'short', day: 'numeric'})}</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">{Math.floor((record.endTime! - record.startTime) / 3600000)}h Actual / {record.targetDuration/3600000}h Target</p>
                        </div>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m9 18 6-6-6-6"/></svg>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6 animate-in pb-10">
             <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <h3 className="font-semibold mb-4 text-zinc-700 dark:text-zinc-300">Weekly Scheduler</h3>
                <p className="text-xs text-zinc-500 mb-6">Tap a day to customize its fasting target.</p>
                <div className="space-y-2">
                   {DAYS.map((day, idx) => {
                     const plan = getPlanById(appState.weeklySchedule[idx]);
                     return (
                       <button 
                         key={day}
                         onClick={() => {
                            setShowPlanPicker({ active: true, dayIndex: idx });
                            if (plan.id.startsWith('custom-')) {
                              setCustomFastValue(plan.fastHours);
                            }
                         }}
                         className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-800/40 border border-zinc-100 dark:border-white/5 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                       >
                         <span className="font-bold text-sm w-12 text-left text-zinc-800 dark:text-white">{day}</span>
                         <span className="text-teal-600 dark:text-teal-400 text-sm font-mono font-bold">{plan.name}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 dark:text-zinc-600"><path d="m9 18 6-6-6-6"/></svg>
                       </button>
                     );
                   })}
                </div>
             </div>

             <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-zinc-700 dark:text-zinc-300">Achievements</h3>
                  <span className="text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                    {achievements.filter(a => a.done).length} / {achievements.length}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {achievements.map((goal) => (
                    <div key={goal.id} className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${goal.done ? 'bg-teal-500/10 dark:bg-teal-400/10 border-teal-500/30 dark:border-teal-400/30' : 'bg-white dark:bg-zinc-800/20 border-zinc-100 dark:border-white/5 opacity-50'}`}>
                       <span className={`text-2xl mb-1 ${!goal.done && 'grayscale'}`}>{goal.icon}</span>
                       <span className={`text-[9px] text-center font-bold uppercase leading-tight ${goal.done ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400 dark:text-zinc-600'}`}>
                         {goal.label}
                       </span>
                       <span className="text-[7px] text-center text-zinc-400 mt-1 uppercase tracking-tighter">
                         {goal.sub}
                       </span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Plan Picker Overlay */}
      {showPlanPicker.active && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 overflow-hidden">
           <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowPlanPicker({ active: false })}></div>
           <div className="relative bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
              <h2 className="text-xl font-bold mb-6 text-zinc-900 dark:text-white">
                {showPlanPicker.dayIndex !== undefined ? `Target for ${DAYS[showPlanPicker.dayIndex]}` : 'Select Plan'}
              </h2>
              
              <div className="mb-8 p-5 bg-zinc-50 dark:bg-zinc-800/80 rounded-3xl border border-zinc-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Custom Fast</span>
                  <span className="text-2xl font-mono font-bold text-teal-600 dark:text-teal-400">{customFastValue}h</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="72" 
                  value={customFastValue} 
                  onChange={(e) => setCustomFastValue(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-teal-500 mb-6"
                />
                <button 
                  onClick={() => {
                    if (showPlanPicker.dayIndex !== undefined) {
                      updateSchedule(showPlanPicker.dayIndex, `custom-${customFastValue}`);
                    }
                  }}
                  className="w-full py-3 bg-teal-500 dark:bg-teal-400 text-white dark:text-zinc-950 font-bold rounded-xl text-sm transition-transform active:scale-95"
                >
                  Set Custom {customFastValue}h
                </button>
              </div>

              <div className="space-y-3 max-h-[35vh] overflow-y-auto pr-1">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 pl-1">Presets</p>
                {FASTING_PLANS.map(plan => (
                  <button 
                    key={plan.id}
                    onClick={() => {
                      if (showPlanPicker.dayIndex !== undefined) {
                        updateSchedule(showPlanPicker.dayIndex, plan.id);
                      }
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      (showPlanPicker.dayIndex !== undefined && appState.weeklySchedule[showPlanPicker.dayIndex] === plan.id) 
                      ? 'bg-teal-500/10 dark:bg-teal-400/10 border-teal-500/50 dark:border-teal-400/50' 
                      : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg text-zinc-800 dark:text-white">{plan.name}</span>
                      {showPlanPicker.dayIndex !== undefined && appState.weeklySchedule[showPlanPicker.dayIndex] === plan.id && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600 dark:text-teal-400"><path d="M20 6 9 17l-5-5"/></svg>
                      )}
                    </div>
                    <p className="text-zinc-500 text-xs">{plan.description}</p>
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowPlanPicker({ active: false })}
                className="w-full mt-6 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-2xl transition-colors"
              >
                Cancel
              </button>
           </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800/50 safe-bottom z-40 transition-colors">
        <div className="max-w-md mx-auto flex justify-between px-12 py-4">
          <NavItem active={activeTab === 'timer'} isDark={isDarkMode} onClick={() => setActiveTab('timer')} icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} label="Timer" />
          <NavItem active={activeTab === 'analytics'} isDark={isDarkMode} onClick={() => setActiveTab('analytics')} icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>} label="Analytics" />
          <NavItem active={activeTab === 'goals'} isDark={isDarkMode} onClick={() => setActiveTab('goals')} icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>} label="Plan" />
        </div>
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean, isDark: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, isDark, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? (isDark ? 'text-teal-400 scale-110' : 'text-teal-600 scale-110') : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600')}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
