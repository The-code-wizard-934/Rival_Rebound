import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, LogOut, ShieldCheck, User as UserIcon, Timer, Music, Image as ImageIcon, CheckCircle2, XCircle, Maximize, Minimize, AlertTriangle, ChevronDown, ChevronUp, Activity, BarChart3, Volume2, VolumeX, Pause, RotateCcw } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, getDocs, collection, query, orderBy, limit, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where, increment } from 'firebase/firestore';
import { GameState, Question, UserProfile, Team } from './types';
import { seedDatabase } from './seed';
import { cn } from './lib/utils';

// --- Components ---

const Navbar = () => {
  const { profile, logout } = useAuth();
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!profile || profile.role === 'admin') {
      setRank(null);
      return;
    }
    const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(16));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topUsers = snapshot.docs.map(doc => doc.id);
      const currentRank = topUsers.indexOf(profile.uid) + 1;
      setRank(currentRank > 0 ? currentRank : null);
    }, (error) => console.error("Rank fetch error:", error));
    return () => unsubscribe();
  }, [profile]);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tighter text-white">TECH TRIVIA</span>
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {rank && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                  className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                  <span className="text-[11px] font-black text-amber-500 tracking-wider">RANK #{rank}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white leading-none mb-1">{profile.displayName}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{profile.role}</p>
            </div>
            <img src={profile.photoURL} alt={profile.displayName} className="w-9 h-9 rounded-full border-2 border-white/10" referrerPolicy="no-referrer" />
            <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const LoginView = () => {
  const { login, error, isLoggingIn } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-cyan-500/20">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">TECH TRIVIA</h1>
          <p className="text-gray-400 text-lg">The ultimate real-time auditorium quiz experience.</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={login}
            disabled={isLoggingIn}
            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 group"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            )}
            {isLoggingIn ? 'Connecting...' : 'Continue with Google'}
          </button>
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Hint: If nothing happens, make sure popups are enabled or try opening the app in a new tab.
          </p>
        </div>
        
        <p className="text-xs text-gray-500">By continuing, you agree to participate in the live event.</p>
      </motion.div>
    </div>
  );
};

const QuestionEditor = ({ onSave, editingQuestion, onCancel }: { onSave: () => void, editingQuestion?: Question | null, onCancel?: () => void }) => {
  const [q, setQ] = useState<Partial<Question>>({
    id: '',
    text: '',
    type: 'mcq',
    options: ['', '', '', ''],
    correctIndex: 0,
    points: 100,
    duration: 15,
    round: 1
  });

  useEffect(() => {
    if (editingQuestion) {
      setQ(editingQuestion);
    } else {
      setQ({
        id: '',
        text: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctIndex: 0,
        points: 100,
        duration: 15,
        round: 1
      });
    }
  }, [editingQuestion]);

  const save = async () => {
    if (!q.id || !q.text) return;
    await setDoc(doc(db, 'questions', q.id), q);
    onSave();
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">{editingQuestion ? 'Edit Question' : 'Add Question'}</h3>
        {editingQuestion && (
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white underline">Cancel Edit</button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input 
          placeholder="ID (e.g. 4)" 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white"
          value={q.id || ''} onChange={e => setQ({...q, id: e.target.value})}
        />
        <select 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white"
          value={q.type || 'mcq'} onChange={e => setQ({...q, type: e.target.value as any})}
        >
          <option value="mcq">MCQ</option>
          <option value="image">Image</option>
          <option value="audio">Audio</option>
        </select>
      </div>
      <textarea 
        placeholder="Question Text" 
        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white"
        value={q.text || ''} onChange={e => setQ({...q, text: e.target.value})}
      />
      <div className="grid grid-cols-2 gap-2">
        {q.options?.map((opt, i) => (
          <input 
            key={i} placeholder={`Option ${i+1}`} 
            className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
            value={opt || ''} onChange={e => {
              const newOpts = [...(q.options || [])];
              newOpts[i] = e.target.value;
              setQ({...q, options: newOpts});
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <input 
          type="number" placeholder="Correct Index (0-3)" 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
          value={isNaN(q.correctIndex as number) ? '' : q.correctIndex} 
          onChange={e => setQ({...q, correctIndex: e.target.value === '' ? NaN : parseInt(e.target.value)})}
        />
        <input 
          type="number" placeholder="Points" 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
          value={isNaN(q.points as number) ? '' : q.points} 
          onChange={e => setQ({...q, points: e.target.value === '' ? NaN : parseInt(e.target.value)})}
        />
        <input 
          type="number" placeholder="Duration (s)" 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
          value={isNaN(q.duration as number) ? '' : q.duration} 
          onChange={e => setQ({...q, duration: e.target.value === '' ? NaN : parseInt(e.target.value)})}
        />
        <select 
          className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
          value={q.round || 1} onChange={e => setQ({...q, round: parseInt(e.target.value)})}
        >
          <option value={1}>Round 1</option>
          <option value={2}>Round 2</option>
        </select>
      </div>
      <input 
        placeholder="Media URL (Optional)" 
        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm"
        value={q.mediaUrl || ''} onChange={e => setQ({...q, mediaUrl: e.target.value})}
      />
      <button 
        onClick={save}
        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-all"
      >
        Save Question
      </button>
    </div>
  );
};

const AuditoriumDisplay = () => {
  const { gameState } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<(Team & { members: UserProfile[] })[]>([]);
  const [audiencePoll, setAudiencePoll] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState?.status === 'round_transition') {
      const unsubscribe = onSnapshot(collection(db, 'teams'), async (snapshot) => {
        const teamsData = snapshot.docs.map(doc => doc.data() as Team);
        const teamsWithMembers = await Promise.all(teamsData.map(async (team) => {
          const members = await Promise.all((team.memberUids || []).map(async (uid) => {
            const userDoc = await getDoc(doc(db, 'users', uid));
            return userDoc.data() as UserProfile;
          }));
          return { ...team, members: members.filter(m => !!m) };
        }));
        setAllTeams(teamsWithMembers);
      });
      return () => unsubscribe();
    }
  }, [gameState?.status]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const isAudio = currentQuestion?.type === 'audio' && currentQuestion.mediaUrl && currentQuestion.mediaUrl.trim().startsWith('http');
    if (gameState?.status === 'question_active' && isAudio) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentQuestion.mediaUrl);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      
      audioRef.current.volume = isMuted ? 0 : volume;
      
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio play failed", e);
          }
        });
      } else {
        audioRef.current.pause();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
        setIsPlaying(true);
      }
    }
  }, [gameState?.status, currentQuestion, volume, isMuted, isPlaying]);

  useEffect(() => {
    if (gameState?.currentQuestionId) {
      setCurrentQuestion(null); // Reset immediately
      getDoc(doc(db, 'questions', gameState.currentQuestionId)).then(d => {
        if (d.exists()) setCurrentQuestion(d.data() as Question);
      });
    } else {
      setCurrentQuestion(null);
    }
  }, [gameState?.currentQuestionId]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(16));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.error("Users sync error:", error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const teamsData = snapshot.docs.map(doc => doc.data() as Team);
      setTeamLeaderboard([...teamsData].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0)));
    }, (error) => {
      console.error("Teams sync error:", error);
      handleFirestoreError(error, OperationType.LIST, 'teams');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeTeams();
    };
  }, []);

  useEffect(() => {
    if (gameState?.status === 'showing_results' && gameState.currentQuestionId && gameState.round === 2) {
      const q = query(collection(db, 'responses'), where('questionId', '==', gameState.currentQuestionId), where('isAudience', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const counts = [0, 0, 0, 0];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.selectedIndex >= 0 && data.selectedIndex < 4) {
            counts[data.selectedIndex]++;
          }
        });
        const total = counts.reduce((a, b) => a + b, 0);
        if (total > 0) {
          setAudiencePoll(counts.map(c => Math.round((c / total) * 100)));
        } else {
          setAudiencePoll([]);
        }
      });
      return () => unsubscribe();
    } else {
      setAudiencePoll([]);
    }
  }, [gameState?.status, gameState?.currentQuestionId, gameState?.round]);

  useEffect(() => {
    if (gameState?.status === 'question_active' && gameState.startTime && currentQuestion) {
      const updateTimer = () => {
        const start = new Date(gameState.startTime!).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, currentQuestion.duration - elapsed);
        setTimeLeft(remaining);
      };
      
      updateTimer(); // Run immediately
      const interval = setInterval(updateTimer, 100);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [gameState?.status, gameState?.startTime, currentQuestion]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#050505] text-white flex flex-col items-center overflow-y-auto relative py-12 px-6 md:px-12">
      <button 
        onClick={toggleFullscreen}
        className="absolute top-8 right-8 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all z-50 group"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize className="w-6 h-6 text-gray-400 group-hover:text-white" />
        ) : (
          <Maximize className="w-6 h-6 text-gray-400 group-hover:text-white" />
        )}
      </button>

      <AnimatePresence mode="wait">
        {gameState?.status === 'question_active' && currentQuestion ? (
          <motion.div 
            key="question"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="max-w-5xl w-full space-y-12 text-center"
          >
            <div className="flex justify-center">
              <div className={cn(
                "w-32 h-32 rounded-full border-8 flex items-center justify-center text-5xl font-black transition-all",
                timeLeft < 5 ? "border-red-500 text-red-500 animate-pulse" : "border-cyan-500 text-cyan-500"
              )}>
                {timeLeft}
              </div>
            </div>
            <h1 className="text-6xl font-black tracking-tight leading-tight">
              {currentQuestion.text}
            </h1>
            {currentQuestion.mediaUrl && (
              <div className="flex flex-col items-center gap-6">
                <div className="flex justify-center">
                  {currentQuestion.type === 'image' ? (
                    <img src={currentQuestion.mediaUrl} className="max-h-[40vh] rounded-3xl shadow-2xl border-4 border-white/10" referrerPolicy="no-referrer" />
                  ) : currentQuestion.type === 'audio' ? (
                    <div className="w-48 h-48 bg-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/50 relative overflow-hidden">
                      <Music className="w-24 h-24 text-white" />
                      {!isPlaying && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Pause className="w-16 h-16 text-white" /></div>}
                    </div>
                  ) : null}
                </div>

                {currentQuestion.type === 'audio' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-6 shadow-2xl"
                  >
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-white transition-all shadow-lg shadow-cyan-500/20"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>

                    <button 
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = 0;
                          if (!isPlaying) setIsPlaying(true);
                        }
                      }}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-3 min-w-[200px]">
                      <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 text-red-400" /> : <Volume2 className="w-6 h-6" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          if (isMuted) setIsMuted(false);
                        }}
                        className="flex-1 accent-cyan-500 h-1.5 bg-white/10 rounded-full cursor-pointer"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-8">
              {currentQuestion.options.map((opt, i) => {
                const isCorrect = i === currentQuestion.correctIndex;
                const showAnswer = timeLeft === 0;
                
                return (
                  <motion.div 
                    key={i} 
                    animate={showAnswer && isCorrect ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ repeat: showAnswer && isCorrect ? Infinity : 0, duration: 1 }}
                    className={cn(
                      "p-8 border-2 rounded-3xl text-3xl font-bold flex items-center gap-6 transition-all duration-500",
                      showAnswer 
                        ? isCorrect 
                          ? "bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_40px_rgba(34,197,94,0.2)]" 
                          : "bg-white/5 border-white/5 text-white/30"
                        : "bg-white/5 border-white/10 text-white"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      showAnswer && isCorrect ? "bg-green-500 text-white" : "bg-white/10 text-cyan-400"
                    )}>
                      {showAnswer && isCorrect ? <CheckCircle2 className="w-8 h-8" /> : String.fromCharCode(65 + i)}
                    </div>
                    {opt}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : gameState?.status === 'showing_results' ? (
          <motion.div 
            key="leaderboard"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl w-full space-y-6 md:space-y-8 my-auto"
          >
            <h1 className="text-4xl md:text-6xl font-black text-center mb-8 md:mb-12 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent uppercase">
              {gameState.round === 2 ? "Team Leaderboard" : "Individual Leaderboard"}
            </h1>
            
            <div className={cn("grid gap-8", gameState.round === 2 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
              <div className={cn("space-y-3 md:space-y-4", gameState.round === 2 ? "lg:col-span-2" : "")}>
                {gameState.round === 2 ? (
                  teamLeaderboard.map((team, i) => (
                    <motion.div 
                      key={team.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-6 md:p-8 bg-white/5 border-2 border-cyan-500/20 rounded-3xl"
                    >
                      <div className="flex items-center gap-4 md:gap-8">
                        <span className="text-2xl md:text-4xl font-black text-gray-500 w-12 md:w-16">#{i + 1}</span>
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center">
                          <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
                        </div>
                        <span className="text-2xl md:text-4xl font-bold">{team.name}</span>
                      </div>
                      <span className="text-3xl md:text-5xl font-black text-cyan-400">{team.totalScore}</span>
                    </motion.div>
                  ))
                ) : (
                  leaderboard.map((user, i) => (
                    <motion.div 
                      key={user.uid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl"
                    >
                      <div className="flex items-center gap-4 md:gap-6">
                        <span className="text-2xl md:text-3xl font-black text-gray-500 w-10 md:w-12">#{i + 1}</span>
                        <img src={user.photoURL} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-cyan-500/50" referrerPolicy="no-referrer" />
                        <span className="text-xl md:text-3xl font-bold">{user.displayName}</span>
                      </div>
                      <span className="text-2xl md:text-4xl font-black text-cyan-400">{user.totalScore}</span>
                    </motion.div>
                  ))
                )}
              </div>

              {gameState.round === 2 && (
                <div className="space-y-6">
                  <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
                    <h3 className="text-xl font-black text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Users className="w-5 h-5" /> Audience Poll
                    </h3>
                    <div className="space-y-6">
                      {audiencePoll.length > 0 ? (
                        audiencePoll.map((percent, i) => (
                          <div key={i} className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-gray-400">Option {String.fromCharCode(65 + i)}</span>
                              <span className="text-white">{percent}%</span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                className={cn(
                                  "h-full rounded-full",
                                  i === currentQuestion?.correctIndex ? "bg-green-500" : "bg-cyan-500/50"
                                )}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 italic text-center py-8">Waiting for audience responses...</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : gameState?.status === 'round_transition' ? (
          <motion.div 
            key="teams-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl w-full space-y-12 my-auto"
          >
            <div className="text-center space-y-4">
              <h1 className="text-7xl font-black tracking-tighter text-white uppercase">Round 2: Team Battle</h1>
              <p className="text-2xl text-cyan-400 font-bold tracking-widest uppercase">The Top 16 have been divided into 4 Elite Teams</p>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              {allTeams.map((team, idx) => (
                <motion.div 
                  key={team.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className="p-8 bg-white/5 border-2 border-white/10 rounded-[40px] space-y-6 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-24 h-24 text-white" />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-cyan-400 font-black text-sm tracking-widest uppercase">Team {idx + 1}</p>
                    <h2 className="text-4xl font-black text-white uppercase">{team.name}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {team.members.map((member) => (
                      <div key={member.uid} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <img src={member.photoURL} className="w-12 h-12 rounded-full border-2 border-cyan-500/30" referrerPolicy="no-referrer" />
                        <div className="overflow-hidden">
                          <p className="text-lg font-bold text-white truncate leading-tight">{member.displayName.split(' ')[0]}</p>
                          <p className="text-[10px] text-gray-500 font-mono uppercase">Elite Member</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-8"
          >
            <div className="w-48 h-48 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-[40px] mx-auto flex items-center justify-center shadow-2xl shadow-cyan-500/20 animate-bounce">
              <Trophy className="w-24 h-24 text-white" />
            </div>
            <h1 className="text-8xl font-black tracking-tighter">TECH TRIVIA</h1>
            <p className="text-3xl text-gray-400 font-medium">GET READY TO COMPETE</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminDashboard = () => {
  const { gameState } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<{ text: string, type: 'info' | 'error' } | null>(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingAction, setPendingAction] = useState<'remove_participants' | 'clear_q1' | 'clear_q2' | 'back_to_r1' | null>(null);
  const [undoTask, setUndoTask] = useState<{ label: string; execute: () => Promise<void>; timeLeft: number } | null>(null);
  const [activeRoundTab, setActiveRoundTab] = useState<number>(1);
  const [teams, setTeams] = useState<(Team & { members: UserProfile[] })[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    studentCount: 0,
    activeUsers: 0,
    totalResponses: 0
  });

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setStats(prev => ({
        ...prev,
        totalUsers: users.length,
        adminCount: users.filter(u => u.role === 'admin').length,
        studentCount: users.filter(u => u.role === 'student').length,
        activeUsers: users.filter(u => u.totalScore > 0).length
      }));
    });

    const unsubscribeResponses = onSnapshot(collection(db, 'responses'), (snapshot) => {
      setStats(prev => ({
        ...prev,
        totalResponses: snapshot.size
      }));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeResponses();
    };
  }, []);

  useEffect(() => {
    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), async (snapshot) => {
      const teamsData = snapshot.docs.map(doc => doc.data() as Team);
      const teamsWithMembers = await Promise.all(teamsData.map(async (team) => {
        const members = await Promise.all((team.memberUids || []).map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          return userDoc.data() as UserProfile;
        }));
        return { ...team, members: members.filter(m => !!m) };
      }));
      setTeams(teamsWithMembers);
    });
    return () => unsubscribeTeams();
  }, []);

  useEffect(() => {
    if (adminMessage) {
      const timer = setTimeout(() => setAdminMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [adminMessage]);

  useEffect(() => {
    if (!undoTask) return;
    if (undoTask.timeLeft <= 0) {
      undoTask.execute();
      setUndoTask(null);
      return;
    }
    const timer = setInterval(() => {
      setUndoTask(prev => prev ? { ...prev, timeLeft: prev.timeLeft - 1 } : null);
    }, 1000);
    return () => clearInterval(timer);
  }, [undoTask]);

  const scheduleTask = (label: string, execute: () => Promise<void>) => {
    if (undoTask) undoTask.execute();
    setUndoTask({ label, execute, timeLeft: 10 });
  };

  useEffect(() => {
    const path = 'questions';
    // Remove Firestore ordering and handle it in-memory for natural numeric sorting
    const q = query(collection(db, path));
    return onSnapshot(q, (snapshot) => {
      const qs = snapshot.docs.map(doc => doc.data() as Question);
      // Sort numerically by ID
      qs.sort((a, b) => {
        const idA = parseInt(a.id);
        const idB = parseInt(b.id);
        if (!isNaN(idA) && !isNaN(idB)) {
          return idA - idB;
        }
        return a.id.localeCompare(b.id);
      });
      setQuestions(qs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, []);

  const updateGameState = async (updates: Partial<GameState>) => {
    const path = 'game_state/current';
    try {
      await setDoc(doc(db, 'game_state', 'current'), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const startQuestion = async (qId: string) => {
    await updateGameState({
      status: 'question_active',
      currentQuestionId: qId,
      startTime: new Date().toISOString(),
    });
  };

  const resetGame = async () => {
    try {
      // 1. Reset Game State
      await setDoc(doc(db, 'game_state', 'current'), { 
        status: 'idle', 
        currentQuestionId: null,
        round: 1,
        startTime: null
      }, { merge: true });

      const updates: { ref: any, data: any }[] = [];
      const deletes: any[] = [];
      
      // 2. Reset User Scores and Team associations
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(d => {
        updates.push({ ref: d.ref, data: { totalScore: 0, round2Score: 0, teamId: null } });
      });

      // 3. Reset Team Scores
      const teamsSnap = await getDocs(collection(db, 'teams'));
      teamsSnap.docs.forEach(d => {
        updates.push({ ref: d.ref, data: { totalScore: 0 } });
      });

      // 4. Delete Responses
      const responsesSnap = await getDocs(collection(db, 'responses'));
      responsesSnap.docs.forEach(d => {
        deletes.push(d.ref);
      });

      // Execute updates in batches
      for (let i = 0; i < updates.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = updates.slice(i, i + 500);
        chunk.forEach(item => batch.update(item.ref, item.data));
        await batch.commit();
      }

      // Execute deletes in batches
      for (let i = 0; i < deletes.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = deletes.slice(i, i + 500);
        chunk.forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      setAdminMessage({ text: "Game, scores, and responses reset successfully", type: 'info' });
      setConfirmReset(false);
    } catch (error) {
      console.error("Reset failed:", error);
      setAdminMessage({ text: "Failed to reset game completely", type: 'error' });
    }
  };

  const clearQuestions = async (round?: number) => {
    const execute = async () => {
      try {
        const q = round 
          ? query(collection(db, 'questions'), where('round', '==', round))
          : query(collection(db, 'questions'));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        setAdminMessage({ text: round ? `Round ${round} questions cleared` : "All questions cleared", type: 'info' });
      } catch (error) {
        setAdminMessage({ text: "Failed to clear questions", type: 'error' });
      }
    };

    scheduleTask(round ? `Clear Round ${round}` : "Clear All Questions", execute);
    setPendingAction(null);
  };

  const removeAllParticipants = async () => {
    const execute = async () => {
      try {
        const refsToDelete: any[] = [];
        
        // 1. Get students
        const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        snap.docs.forEach(d => refsToDelete.push(d.ref));
        
        // 2. Get teams
        const teamsSnap = await getDocs(collection(db, 'teams'));
        teamsSnap.docs.forEach(d => refsToDelete.push(d.ref));

        // 3. Get responses
        const responsesSnap = await getDocs(collection(db, 'responses'));
        responsesSnap.docs.forEach(d => refsToDelete.push(d.ref));

        // Execute in batches of 500
        for (let i = 0; i < refsToDelete.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = refsToDelete.slice(i, i + 500);
          chunk.forEach(ref => batch.delete(ref));
          await batch.commit();
        }

        setAdminMessage({ text: "All participants, teams, and responses removed", type: 'info' });
      } catch (error) {
        console.error("Cleanup failed:", error);
        setAdminMessage({ text: "Failed to remove participants", type: 'error' });
      }
    };

    scheduleTask("Remove All Participants", execute);
    setPendingAction(null);
  };

  const resetToRound1 = async () => {
    try {
      await updateGameState({
        status: 'idle',
        currentQuestionId: null,
        round: 1,
        startTime: null
      });
      setAdminMessage({ text: "Returned to Round 1 (Scores preserved)", type: 'info' });
      setPendingAction(null);
    } catch (error) {
      setAdminMessage({ text: "Failed to return to Round 1", type: 'error' });
    }
  };

  const deleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'questions', id));
      setDeletingId(null);
      setAdminMessage({ text: "Question deleted successfully", type: 'info' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
      setAdminMessage({ text: "Failed to delete question", type: 'error' });
    }
  };

  const transitionToRound2 = async () => {
    // Step 1: Clear old teamIds
    const usersWithTeamsSnap = await getDocs(query(collection(db, 'users'), where('teamId', '!=', null)));
    const clearBatch = writeBatch(db);
    usersWithTeamsSnap.docs.forEach(d => clearBatch.update(d.ref, { teamId: null }));
    await clearBatch.commit();

    // Step 2: Get top 16 and form teams
    const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(16)));
    const topUsers = usersSnap.docs.map(d => d.data() as UserProfile);
    if (topUsers.length < 16) {
      setAdminMessage({ text: "Need at least 16 students to form 4 teams!", type: 'error' });
      return;
    }

    const shuffled = [...topUsers].sort(() => Math.random() - 0.5);
    const teamNames = ["CYBER KNIGHTS", "NEON NINJAS", "PIXEL PREDATORS", "CODE CRUSHERS"];

    const teamsBatch = writeBatch(db);
    for (let i = 0; i < 4; i++) {
      const teamId = `team_${i + 1}`;
      const members = shuffled.slice(i * 4, (i + 1) * 4);
      const memberUids = members.map(u => u.uid);
      
      teamsBatch.set(doc(db, 'teams', teamId), { 
        id: teamId, 
        name: teamNames[i], 
        memberUids, 
        totalScore: 0 
      });
      memberUids.forEach(uid => teamsBatch.update(doc(db, 'users', uid), { 
        teamId,
        round2Score: 0
      }));
    }
    await teamsBatch.commit(); // ✅ teamIds land on students FIRST

    // Step 3: ONLY NOW update game_state — gives profile snapshots time to fire
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s buffer for listeners
    await setDoc(doc(db, 'game_state', 'current'), {
      status: 'round_transition',
      round: 2,
      currentQuestionId: null
    }, { merge: true });

    setAdminMessage({ text: "Round 2 Teams Formed!", type: 'info' });
  };

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="text-cyan-500" /> Admin Controller
        </h2>
        <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-sm text-gray-300">
          Status: <span className="text-cyan-400 font-mono uppercase">{gameState?.status || 'NOT INITIALIZED'}</span>
        </div>
      </div>

      {!gameState && (
        <div className="mb-8 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
          <p className="font-bold mb-2">Database Not Initialized</p>
          <p className="text-sm">Please click the "Seed Sample Data" button below to set up the initial game state and questions.</p>
        </div>
      )}

      <AnimatePresence>
        {undoTask && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-black text-xs">
                {undoTask.timeLeft}
              </div>
              <p className="text-sm font-bold text-amber-400">
                {undoTask.label} in {undoTask.timeLeft}s...
              </p>
            </div>
            <button 
              onClick={() => setUndoTask(null)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Undo
            </button>
          </motion.div>
        )}
        {adminMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "mb-6 p-4 rounded-xl border font-bold text-center",
              adminMessage.type === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            )}
          >
            {adminMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Total Logins', value: stats.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Admins', value: stats.adminCount, icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Students', value: stats.studentCount, icon: UserIcon, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Active Now', value: stats.activeUsers, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Responses', value: stats.totalResponses, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2"
          >
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.bg)}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <QuestionEditor 
            onSave={() => setEditingQuestion(null)} 
            editingQuestion={editingQuestion}
            onCancel={() => setEditingQuestion(null)}
          />
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Quiz Flow</h3>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                {[1, 2].map((roundNum) => (
                  <button
                    key={roundNum}
                    onClick={() => setActiveRoundTab(roundNum)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                      activeRoundTab === roundNum 
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/20" 
                        : "text-gray-500 hover:text-white"
                    )}
                  >
                    Round {roundNum}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {questions.filter(q => (q.round || 1) === activeRoundTab).map((q) => (
                <div key={q.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/20 transition-all">
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-1">Q{q.id} • {q.type.toUpperCase()} • {q.points}pts</p>
                    <p className="text-white font-medium">{q.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {deletingId === q.id ? (
                      <div className="flex items-center gap-2 bg-red-500/10 p-1 rounded-lg border border-red-500/20">
                        <button 
                          onClick={() => deleteQuestion(q.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded-md font-bold"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setEditingQuestion(q)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeletingId(q.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => startQuestion(q.id)}
                      disabled={gameState?.currentQuestionId === q.id && gameState?.status === 'question_active'}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" /> Launch
                    </button>
                  </div>
                </div>
              ))}
              {questions.filter(q => (q.round || 1) === activeRoundTab).length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-4">No questions added for Round {activeRoundTab}</p>
              )}
            </div>
          </div>

          {teams.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" /> Round 2 Teams
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team) => (
                  <div key={team.id} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-cyan-400 uppercase tracking-tight">{team.name}</h4>
                      <span className="text-xs font-mono text-gray-500">{team.totalScore} pts</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {team.members.map(member => (
                        <div key={member.uid} className="flex items-center gap-1 bg-white/5 p-1 pr-2 rounded-full border border-white/5" title={member.displayName}>
                          <img src={member.photoURL} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                          <span className="text-[10px] font-bold text-gray-300 truncate max-w-[60px]">{member.displayName.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => updateGameState({ status: 'showing_results' })}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all"
              >
                Show Leaderboard
              </button>
              <button 
                onClick={transitionToRound2}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all"
              >
                Transition to Round 2
              </button>
              <button 
                onClick={seedDatabase}
                className="w-full py-3 bg-cyan-900/30 border border-cyan-500/30 text-cyan-400 rounded-xl font-bold transition-all hover:bg-cyan-900/50"
              >
                Seed Sample Data
              </button>
              <a 
                href="?display=true" 
                target="_blank" 
                className="w-full py-3 bg-white text-black text-center rounded-xl font-bold transition-all hover:bg-gray-200"
              >
                Open Auditorium Display
              </a>
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl overflow-hidden">
            <button 
              onClick={() => setShowDangerZone(!showDangerZone)}
              className="w-full p-4 flex items-center justify-between text-red-400 hover:bg-red-500/5 transition-all"
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
                DANGER ZONE
              </div>
              {showDangerZone ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <AnimatePresence>
              {showDangerZone && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4"
                >
                  <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20 space-y-4">
                    <p className="text-xs text-red-300">These actions are irreversible and will reset the entire game state for all players.</p>
                    {confirmReset ? (
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-red-400">Are you absolutely sure?</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={resetGame}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm transition-all"
                          >
                            Yes, Reset
                          </button>
                          <button 
                            onClick={() => setConfirmReset(false)}
                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <button 
                          onClick={() => setConfirmReset(true)}
                          className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm transition-all"
                        >
                          Reset Game State & Scores
                        </button>
                        
                        <div className="h-px bg-red-500/20 my-2" />
                        
                        <p className="text-[10px] font-black text-red-500/50 uppercase tracking-widest px-1">Specific Resets</p>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {pendingAction === 'remove_participants' ? (
                            <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-xl space-y-3">
                              <p className="text-[10px] font-bold text-red-400 text-center">Delete all students and teams?</p>
                              <div className="flex gap-2">
                                <button onClick={removeAllParticipants} className="flex-1 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold">Confirm</button>
                                <button onClick={() => setPendingAction(null)} className="flex-1 py-1 bg-white/10 text-white rounded-lg text-[10px] font-bold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setPendingAction('remove_participants')}
                              className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <Users className="w-3 h-3" /> Remove All Participants
                            </button>
                          )}
                          
                          <div className="grid grid-cols-2 gap-2">
                            {pendingAction === 'clear_q1' ? (
                              <div className="p-2 bg-red-600/10 border border-red-500/20 rounded-xl space-y-2">
                                <p className="text-[9px] font-bold text-red-400 text-center leading-none">Clear R1?</p>
                                <div className="flex gap-1">
                                  <button onClick={() => clearQuestions(1)} className="flex-1 py-1 bg-red-600 text-white rounded-md text-[9px] font-bold">Yes</button>
                                  <button onClick={() => setPendingAction(null)} className="flex-1 py-1 bg-white/10 text-white rounded-md text-[9px] font-bold">No</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setPendingAction('clear_q1')}
                                className="py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-3 h-3" /> Clear Round 1
                              </button>
                            )}
                            
                            {pendingAction === 'clear_q2' ? (
                              <div className="p-2 bg-red-600/10 border border-red-500/20 rounded-xl space-y-2">
                                <p className="text-[9px] font-bold text-red-400 text-center leading-none">Clear R2?</p>
                                <div className="flex gap-1">
                                  <button onClick={() => clearQuestions(2)} className="flex-1 py-1 bg-red-600 text-white rounded-md text-[9px] font-bold">Yes</button>
                                  <button onClick={() => setPendingAction(null)} className="flex-1 py-1 bg-white/10 text-white rounded-md text-[9px] font-bold">No</button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setPendingAction('clear_q2')}
                                className="py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                              >
                                <XCircle className="w-3 h-3" /> Clear Round 2
                              </button>
                            )}
                          </div>

                          {pendingAction === 'back_to_r1' ? (
                            <div className="p-2 bg-red-600/10 border border-red-500/20 rounded-xl space-y-2">
                              <p className="text-[9px] font-bold text-red-400 text-center leading-none">Return to Round 1? (Scores will be kept)</p>
                              <div className="flex gap-1">
                                <button onClick={resetToRound1} className="flex-1 py-1 bg-red-600 text-white rounded-md text-[9px] font-bold">Yes, Return</button>
                                <button onClick={() => setPendingAction(null)} className="flex-1 py-1 bg-white/10 text-white rounded-md text-[9px] font-bold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setPendingAction('back_to_r1')}
                              className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                              <RotateCcw className="w-3 h-3" /> Return to Round 1
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentView = () => {
  const { profile, gameState } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (profile?.teamId) {
      const teamRef = doc(db, 'teams', profile.teamId);
      const unsubscribeTeam = onSnapshot(teamRef, (snapshot) => {
        if (snapshot.exists()) {
          setTeam(snapshot.data() as Team);
        }
      });

      // Subscribe to all members of this team for real-time score updates
      const q = query(collection(db, 'users'), where('teamId', '==', profile.teamId));
      const unsubscribeMembers = onSnapshot(q, (snapshot) => {
        const members = snapshot.docs.map(doc => doc.data() as UserProfile);
        setTeamMembers(members);
      });

      return () => {
        unsubscribeTeam();
        unsubscribeMembers();
      };
    } else {
      setTeam(null);
      setTeamMembers([]);
    }
  }, [profile?.teamId]);

  useEffect(() => {
    const isAudio = currentQuestion?.type === 'audio' && currentQuestion.mediaUrl && currentQuestion.mediaUrl.trim().startsWith('http');
    if (gameState?.status === 'question_active' && isAudio) {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentQuestion.mediaUrl);
      }
      audioRef.current.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error("Audio play failed", e);
        }
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    }
  }, [gameState?.status, currentQuestion]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (gameState?.currentQuestionId) {
      setCurrentQuestion(null); // Reset immediately
      const fetchQ = async () => {
        const path = `questions/${gameState.currentQuestionId}`;
        try {
          const qDoc = await getDoc(doc(db, 'questions', gameState.currentQuestionId!));
          if (qDoc.exists()) {
            setCurrentQuestion(qDoc.data() as Question);
            setSelectedOption(null);
            setHasAnswered(false);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchQ();
    } else {
      setCurrentQuestion(null);
    }
  }, [gameState?.currentQuestionId]);

  useEffect(() => {
    if (gameState?.status === 'question_active' && gameState.startTime && currentQuestion) {
      const updateTimer = () => {
        const start = new Date(gameState.startTime!).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, currentQuestion.duration - elapsed);
        setTimeLeft(remaining);
      };
      
      updateTimer(); // Run immediately
      const interval = setInterval(updateTimer, 100);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [gameState?.status, gameState?.startTime, currentQuestion]);

  const handleAnswer = async (index: number) => {
    if (hasAnswered || timeLeft === 0 || !currentQuestion || !profile) return;

    setSelectedOption(index);
    setHasAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;
    const isRound2 = Number(gameState?.round) === 2;

    // ✅ THE FIX: Don't trust profile.teamId from stale React state.
    // Resolve team membership fresh from Firestore at answer time.
    let resolvedTeamId: string | null = profile.teamId || null;

    if (isRound2 && !resolvedTeamId) {
      // profile.teamId may not have arrived yet — query directly
      try {
        const freshProfile = await getDoc(doc(db, 'users', profile.uid));
        resolvedTeamId = freshProfile.data()?.teamId || null;
      } catch (e) {
        console.error('[handleAnswer] Failed to fetch fresh profile:', e);
      }
    }

    const isTeamMember = isRound2 && !!resolvedTeamId;
    const isAudience = isRound2 && !resolvedTeamId;

    const points = isCorrect
      ? Math.floor(currentQuestion.points * (timeLeft / currentQuestion.duration))
      : 0;

    let finalPoints = points;
    if (!isCorrect && isRound2 && isTeamMember) {
      // Penalty: deduct precisely 1/4 of question value
      const penaltyValue = Math.floor(currentQuestion.points / 4);
      finalPoints = -penaltyValue;
    }

    const userPointsToAward = isAudience ? 0 : finalPoints;

    const responsePath = `responses/${profile.uid}_${currentQuestion.id}`;
    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'responses', `${profile.uid}_${currentQuestion.id}`), {
        userId: profile.uid,
        questionId: currentQuestion.id,
        selectedIndex: index,
        timeTaken: currentQuestion.duration - timeLeft,
        pointsEarned: userPointsToAward,
        timestamp: new Date().toISOString(),
        isAudience,
      });

      if (userPointsToAward !== 0) {
        const userUpdates: any = {
          totalScore: increment(userPointsToAward)
        };
        if (isRound2) {
          userUpdates.round2Score = increment(userPointsToAward);
        }
        batch.update(doc(db, 'users', profile.uid), userUpdates);
      }

      // Team Score: Atomically increment or decrement
      if (isTeamMember && resolvedTeamId && finalPoints !== 0) {
        batch.update(doc(db, 'teams', resolvedTeamId), {
          totalScore: increment(finalPoints),
        });
      }

      await batch.commit();
      console.log('[handleAnswer] success — penalty applied:', finalPoints);
    } catch (error) {
      console.error('[handleAnswer] Batch write failed:', error);
      handleFirestoreError(error, OperationType.WRITE, responsePath);
    }
  };

  if (!gameState || gameState.status === 'idle' || gameState.status === 'round_transition') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8">
        {!team ? (
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Timer className="w-10 h-10 text-cyan-500" />
              </div>
              <h2 className="text-3xl font-bold text-white">Waiting for Host</h2>
              <p className="text-gray-400">The quiz will begin shortly. Stay tuned!</p>
            </div>
            
            <div className="p-6 bg-white/5 border border-white/10 rounded-3xl">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Your Career Score</div>
              <div className="text-4xl font-black text-white">{profile.totalScore}</div>
              <p className="text-[10px] text-gray-600 mt-2 uppercase font-bold tracking-tight">Total across all rounds</p>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md space-y-6"
          >
            <div className="p-8 bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 rounded-[32px] shadow-2xl shadow-cyan-500/10">
              <div className="w-20 h-20 bg-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/50">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-1">Your Team</h2>
              <h1 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">{team.name}</h1>
              
              <div className="grid grid-cols-1 gap-4 mb-6">
                 <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                    <div className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Team Score</div>
                    <div className="text-3xl font-black text-white">{team.totalScore || 0}</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Team Contribution</div>
                  <div className="text-2xl font-black text-white">{profile.round2Score ?? 0}</div>
                  <p className="text-[8px] text-gray-600 uppercase font-black mt-1">Round 2 only</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                  <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Career Score</div>
                  <div className="text-2xl font-black text-white">{profile.totalScore}</div>
                  <p className="text-[8px] text-gray-600 uppercase font-black mt-1">Total R1 + R2</p>
                </div>
              </div>

              <div className="space-y-3 text-left">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Team Members</p>
                {teamMembers.map((member) => (
                  <div key={member.uid} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <img src={member.photoURL} className="w-10 h-10 rounded-full border border-cyan-500/30" referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white leading-none mb-1">{member.displayName}</p>
                      <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{member.uid === profile.uid ? 'YOU' : 'TEAMMATE'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-cyan-400">{member.round2Score ?? 0}</p>
                      <p className="text-[8px] font-black text-gray-600 uppercase">R2 PTS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-gray-400 flex items-center justify-center gap-2">
              <Timer className="w-4 h-4" /> Waiting for Round 2 to start...
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  if (gameState?.status === 'question_active' && currentQuestion) {
    return (
      <div className="pt-24 px-6 max-w-2xl mx-auto pb-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <div className="px-4 py-2 bg-white/10 rounded-full text-sm font-mono text-white">
              ROUND {gameState.round}
            </div>
            {profile.teamId && (
              <div className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm font-bold text-cyan-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> TEAM MODE
              </div>
            )}
          </div>
          <div className={cn(
            "w-16 h-16 rounded-full border-4 flex items-center justify-center text-xl font-black transition-all",
            timeLeft < 5 ? "border-red-500 text-red-500 animate-bounce" : "border-cyan-500 text-cyan-500"
          )}>
            {timeLeft}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            {currentQuestion.mediaUrl && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                {currentQuestion.type === 'image' ? (
                  <img src={currentQuestion.mediaUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : currentQuestion.type === 'audio' ? (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-cyan-500 rounded-full mx-auto flex items-center justify-center animate-pulse">
                      <Music className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-cyan-400 font-bold">LISTENING...</p>
                  </div>
                ) : null}
              </div>
            )}
            <h3 className="text-2xl font-bold text-white leading-tight">{currentQuestion.text}</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {currentQuestion.options.map((option, idx) => {
              const isCorrect = idx === currentQuestion.correctIndex;
              const isSelected = selectedOption === idx;
              const showAnswer = timeLeft === 0;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={hasAnswered || timeLeft === 0}
                  className={cn(
                    "p-5 rounded-2xl border-2 text-left font-bold transition-all relative overflow-hidden group flex items-center justify-between",
                    showAnswer
                      ? isCorrect
                        ? "bg-green-500/20 border-green-500 text-green-400"
                        : isSelected
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : "bg-white/5 border-white/5 text-white/30"
                      : isSelected
                        ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                        : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20",
                    (hasAnswered && !isSelected && !showAnswer) && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                      showAnswer && isCorrect ? "bg-green-500 text-white" : "bg-white/10"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </div>
                  
                  {showAnswer && isCorrect && <CheckCircle2 className="w-6 h-6 text-green-500 relative z-10" />}
                  {showAnswer && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 relative z-10" />}
                  
                  {isSelected && !showAnswer && (
                    <motion.div 
                      layoutId="active-bg"
                      className="absolute inset-0 bg-cyan-500/10"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Stats Bar */}
        <div className="fixed bottom-6 left-6 right-6 flex justify-center z-40 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-6 md:gap-8 shadow-2xl pointer-events-auto">
            <div className="text-center group">
              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1 opacity-70 group-hover:opacity-100 transition-opacity">Career Score</p>
              <p className="text-lg font-black text-white leading-none">{profile.totalScore}</p>
            </div>
            {team && (
              <>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center group">
                  <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest leading-none mb-1 opacity-70 group-hover:opacity-100 transition-opacity">Team Score</p>
                  <p className="text-lg font-black text-white leading-none">{team.totalScore || 0}</p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center group">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1 opacity-70 group-hover:opacity-100 transition-opacity">Contribution</p>
                  <p className="text-lg font-black text-white leading-none">{profile.round2Score ?? 0}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState?.status === 'showing_results') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-amber-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Check the Big Screen!</h2>
        <p className="text-gray-400 mb-8">Leaderboard is being revealed in the auditorium.</p>
        <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest mb-1">Career Score (R1+R2)</p>
            <p className="text-4xl font-black text-white">{profile.totalScore}</p>
          </div>
          {team && (
            <div className="p-6 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
              <p className="text-[10px] text-cyan-400 uppercase font-black tracking-widest mb-1">Team Contribution (R2)</p>
              <p className="text-4xl font-black text-white">{profile.round2Score ?? 0}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// --- Main App ---

export default function App() {
  const { user, profile, loading } = useAuth();
  const isDisplay = new URLSearchParams(window.location.search).get('display') === 'true';

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (isDisplay) {
    return <AuditoriumDisplay />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-cyan-500/30">
      <Navbar />
      <main>
        {profile?.role === 'admin' ? <AdminDashboard /> : <StudentView />}
      </main>
      
      {/* Background Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full -z-10" />
    </div>
  );
}
