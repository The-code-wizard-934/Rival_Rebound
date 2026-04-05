import { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, LogOut, ShieldCheck, User as UserIcon, Timer, Music, Image as ImageIcon, CheckCircle2, XCircle, Maximize, Minimize, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, getDocs, collection, query, orderBy, limit, onSnapshot, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { GameState, Question, UserProfile, Team } from './types';
import { seedDatabase } from './seed';
import { cn } from './lib/utils';

// --- Components ---

const Navbar = () => {
  const { profile, logout } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tighter text-white">RIVAL REBOUND</span>
      </div>
      <div className="flex items-center gap-4">
        {profile && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{profile.displayName}</p>
              <p className="text-xs text-gray-400 capitalize">{profile.role}</p>
            </div>
            <img src={profile.photoURL} alt={profile.displayName} className="w-8 h-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
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
          <h1 className="text-5xl font-black tracking-tighter text-white">RIVAL REBOUND</h1>
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
    duration: 15
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
        duration: 15
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
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(10));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setLeaderboard(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const tq = query(collection(db, 'teams'), orderBy('totalScore', 'desc'));
    const unsubscribeTeams = onSnapshot(tq, (snapshot) => {
      setTeamLeaderboard(snapshot.docs.map(doc => doc.data() as Team));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teams'));

    return () => {
      unsubscribeUsers();
      unsubscribeTeams();
    };
  }, []);

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
    <div ref={containerRef} className="min-h-screen bg-[#050505] text-white p-12 flex flex-col items-center justify-center overflow-hidden relative">
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
              <div className="flex justify-center">
                {currentQuestion.type === 'image' ? (
                  <img src={currentQuestion.mediaUrl} className="max-h-[40vh] rounded-3xl shadow-2xl border-4 border-white/10" referrerPolicy="no-referrer" />
                ) : currentQuestion.type === 'audio' ? (
                  <div className="w-48 h-48 bg-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-cyan-500/50">
                    <Music className="w-24 h-24 text-white" />
                  </div>
                ) : null}
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
            className="max-w-4xl w-full space-y-8"
          >
            <h1 className="text-6xl font-black text-center mb-12 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent uppercase">
              {gameState.round === 2 ? "Team Leaderboard" : "Individual Leaderboard"}
            </h1>
            <div className="space-y-4">
              {gameState.round === 2 ? (
                teamLeaderboard.map((team, i) => (
                  <motion.div 
                    key={team.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-8 bg-white/5 border-2 border-cyan-500/20 rounded-3xl"
                  >
                    <div className="flex items-center gap-8">
                      <span className="text-4xl font-black text-gray-500 w-16">#{i + 1}</span>
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                      <span className="text-4xl font-bold">{team.name}</span>
                    </div>
                    <span className="text-5xl font-black text-cyan-400">{team.totalScore}</span>
                  </motion.div>
                ))
              ) : (
                leaderboard.map((user, i) => (
                  <motion.div 
                    key={user.uid}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-3xl font-black text-gray-500 w-12">#{i + 1}</span>
                      <img src={user.photoURL} className="w-16 h-16 rounded-full border-2 border-cyan-500/50" referrerPolicy="no-referrer" />
                      <span className="text-3xl font-bold">{user.displayName}</span>
                    </div>
                    <span className="text-4xl font-black text-cyan-400">{user.totalScore}</span>
                  </motion.div>
                ))
              )}
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
            <h1 className="text-8xl font-black tracking-tighter">RIVAL REBOUND</h1>
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

  useEffect(() => {
    if (adminMessage) {
      const timer = setTimeout(() => setAdminMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [adminMessage]);

  useEffect(() => {
    const path = 'questions';
    const q = query(collection(db, path), orderBy('id'));
    return onSnapshot(q, (snapshot) => {
      setQuestions(snapshot.docs.map(doc => doc.data() as Question));
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
      const batch = writeBatch(db);
      
      // 1. Reset Game State
      batch.update(doc(db, 'game_state', 'current'), { 
        status: 'idle', 
        currentQuestionId: null,
        round: 1,
        startTime: null
      });

      // 2. Reset User Scores and Team associations
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(d => {
        batch.update(d.ref, { totalScore: 0, teamId: null });
      });

      // 3. Reset Team Scores
      const teamsSnap = await getDocs(collection(db, 'teams'));
      teamsSnap.docs.forEach(d => {
        batch.update(d.ref, { totalScore: 0 });
      });

      // 4. Delete Responses
      const responsesSnap = await getDocs(collection(db, 'responses'));
      responsesSnap.docs.forEach(d => {
        batch.delete(d.ref);
      });

      await batch.commit();
      setAdminMessage({ text: "Game, scores, and responses reset successfully", type: 'info' });
      setConfirmReset(false);
    } catch (error) {
      console.error("Reset failed:", error);
      setAdminMessage({ text: "Failed to reset game completely", type: 'error' });
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
    const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(16)));
    const topUsers = usersSnap.docs.map(d => d.data() as UserProfile);
    
    if (topUsers.length < 16) {
      setAdminMessage({ text: "Need at least 16 students to form 4 teams!", type: 'error' });
      return;
    }

    const batch = writeBatch(db);
    const shuffled = [...topUsers].sort(() => Math.random() - 0.5);
    const teamNames = ["CYBER KNIGHTS", "NEON NINJAS", "PIXEL PREDATORS", "CODE CRUSHERS"];
    
    for (let i = 0; i < 4; i++) {
      const teamId = `team_${i + 1}`;
      const memberUids = shuffled.slice(i * 4, (i + 1) * 4).map(u => u.uid);
      
      batch.set(doc(db, 'teams', teamId), {
        id: teamId,
        name: teamNames[i],
        memberUids,
        totalScore: 0
      });

      memberUids.forEach(uid => {
        batch.update(doc(db, 'users', uid), { teamId });
      });
    }

    batch.update(doc(db, 'game_state', 'current'), {
      status: 'round_transition',
      round: 2,
      currentQuestionId: null
    });

    await batch.commit();
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <QuestionEditor 
            onSave={() => setEditingQuestion(null)} 
            editingQuestion={editingQuestion}
            onCancel={() => setEditingQuestion(null)}
          />
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Quiz Flow</h3>
            <div className="space-y-4">
              {questions.map((q) => (
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
            </div>
          </div>
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
                      <button 
                        onClick={() => setConfirmReset(true)}
                        className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg font-bold text-sm transition-all"
                      >
                        Reset Game State
                      </button>
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const points = isCorrect ? Math.floor(currentQuestion.points * (timeLeft / currentQuestion.duration)) : 0;

    const path = `responses/${profile.uid}_${currentQuestion.id}`;
    try {
      await setDoc(doc(db, 'responses', `${profile.uid}_${currentQuestion.id}`), {
        userId: profile.uid,
        questionId: currentQuestion.id,
        selectedIndex: index,
        timeTaken: currentQuestion.duration - timeLeft,
        pointsEarned: points,
        timestamp: new Date().toISOString()
      });

      // Update user total score (In production, use Cloud Functions for security)
      if (points > 0) {
        await setDoc(doc(db, 'users', profile.uid), {
          totalScore: (profile.totalScore || 0) + points
        }, { merge: true });

        // Update team score if in Round 2
        if (profile.teamId) {
          const teamRef = doc(db, 'teams', profile.teamId);
          const teamDoc = await getDoc(teamRef);
          if (teamDoc.exists()) {
            await updateDoc(teamRef, {
              totalScore: (teamDoc.data().totalScore || 0) + points
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  if (!gameState || gameState.status === 'idle') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Timer className="w-10 h-10 text-cyan-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Waiting for Host</h2>
        <p className="text-gray-400">The quiz will begin shortly. Stay tuned!</p>
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
      </div>
    );
  }

  if (gameState?.status === 'showing_results') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-amber-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Check the Big Screen!</h2>
        <p className="text-gray-400 mb-8">Leaderboard is being revealed in the auditorium.</p>
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10 w-full max-w-xs">
          <p className="text-sm text-gray-500 uppercase font-bold mb-1">Your Score</p>
          <p className="text-4xl font-black text-white">{profile?.totalScore}</p>
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
