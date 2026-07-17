import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Restaurant, UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  restaurant: Restaurant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, restaurantName: string, phone: string, address: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch user profile
          const profileRef = doc(db, 'users', user.uid);
          const profileSnap = await getDoc(profileRef);
          
          if (profileSnap.exists()) {
            const pData = profileSnap.data() as UserProfile;
            setUserProfile({ ...pData, id: user.uid });

            // Fetch restaurant details
            if (pData.restaurantId) {
              const restRef = doc(db, 'restaurants', pData.restaurantId);
              const restSnap = await getDoc(restRef);
              if (restSnap.exists()) {
                setRestaurant({ ...(restSnap.data() as Restaurant), id: pData.restaurantId });
              }
            }
          } else {
            // Profile doc might not exist yet during register flow, handled there
            setUserProfile(null);
            setRestaurant(null);
          }
        } catch (err) {
          console.error("Error fetching user profile/restaurant:", err);
        }
      } else {
        setUserProfile(null);
        setRestaurant(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    name: string, 
    restaurantName: string, 
    phone: string, 
    address: string
  ) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      
      // Auto generate restaurant ID
      const restaurantId = 'rest_' + Math.random().toString(36).substr(2, 9);
      
      const newRestaurant: Restaurant = {
        id: restaurantId,
        name: restaurantName,
        logo: '', // initially empty, can upload later
        phone,
        address,
        serviceTax: 10, // default 10%
        theme: {
          primary: '#e11d48', // default rose-600
          secondary: '#1e293b' // default slate-800
        },
        ownerId: uid,
        createdAt: new Date().toISOString()
      };

      const newUserProfile: UserProfile = {
        id: uid,
        name,
        email,
        role: 'owner',
        restaurantId,
        createdAt: new Date().toISOString()
      };

      // Save restaurant details in Firestore
      await setDoc(doc(db, 'restaurants', restaurantId), newRestaurant);
      
      // Save user details in Firestore
      await setDoc(doc(db, 'users', uid), newUserProfile);

      // Create default tables for the restaurant (e.g. tables 1 to 5)
      for (let i = 1; i <= 5; i++) {
        const tableId = `${restaurantId}_table_${i}`;
        await setDoc(doc(db, 'tables', tableId), {
          id: tableId,
          number: i,
          status: 'free',
          restaurantId,
          createdAt: new Date().toISOString()
        });
      }

      // Create default categories
      const categories = ['Entradas', 'Pratos Principais', 'Bebidas', 'Sobremesas'];
      for (let i = 0; i < categories.length; i++) {
        const catId = `${restaurantId}_cat_${i}`;
        await setDoc(doc(db, 'categories', catId), {
          id: catId,
          name: categories[i],
          index: i,
          restaurantId,
          createdAt: new Date().toISOString()
        });
      }

      setUserProfile(newUserProfile);
      setRestaurant(newRestaurant);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateRestaurant = async (data: Partial<Restaurant>) => {
    if (!restaurant) return;
    const restRef = doc(db, 'restaurants', restaurant.id);
    await updateDoc(restRef, data);
    setRestaurant((prev) => prev ? { ...prev, ...data } : null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const userRef = doc(db, 'users', userProfile.id);
    await updateDoc(userRef, data);
    setUserProfile((prev) => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      userProfile, 
      restaurant, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      updateRestaurant,
      updateUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};
