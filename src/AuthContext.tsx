import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, GameState } from './types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  gameState: GameState | null;
  loading: boolean;
  isLoggingIn: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser?.email);
      if (firebaseUser) {
        setUser(firebaseUser);
        // We will subscribe to the profile in another useEffect
      } else {
        setUser(null);
        setProfile(null);
        setGameState(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log("Subscribing to profile for:", user.uid);
    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribeProfile = onSnapshot(userDocRef, async (userDoc) => {
      if (userDoc.exists()) {
        console.log("Profile update:", userDoc.data());
        setProfile(userDoc.data() as UserProfile);
      } else {
        console.log("Creating new profile...");
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Anonymous',
          photoURL: user.photoURL || '',
          role: user.email === 'yashbose35@gmail.com' ? 'admin' : 'student',
          totalScore: 0,
        };
        try {
          await setDoc(userDocRef, newProfile);
          // Initial set will trigger another snapshot
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Profile subscription error:", error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const path = 'game_state/current';
    const unsubscribeGameState = onSnapshot(
      doc(db, 'game_state', 'current'), 
      (doc) => {
        if (doc.exists()) {
          setGameState(doc.data() as GameState);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribeGameState();
  }, [user]);

  const login = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      console.log("Starting login...");
      await signInWithPopup(auth, googleProvider);
      console.log("Login call finished");
    } catch (err: any) {
      console.error("Login failed:", err);
      if (err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || "Login failed. Please check if popups are blocked.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, gameState, loading, isLoggingIn, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
