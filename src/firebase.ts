import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider setup with requested Workspace scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory and session-persistent access token cache
let cachedAccessToken: string | null = typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null;
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const persistedToken = sessionStorage.getItem('google_access_token');
      if (persistedToken) {
        cachedAccessToken = persistedToken;
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('google_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google Workspace access token from Auth response.');
    }
    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('google_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out Google session
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem('google_access_token');
};

// Save Booking Lead to Firestore
export interface BookingLead {
  id?: string;
  parentName: string;
  parentPhone: string;
  childAge: string;
  preferredSport: string;
  parentEmail: string;
  specialNotes?: string;
  ticketRef: string;
  timestamp: string;
  syncedToSheets?: boolean;
}

export const saveBookingLead = async (lead: BookingLead): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'bookings'), {
      ...lead,
      syncedToSheets: lead.syncedToSheets || false
    });
    return docRef.id;
  } catch (error) {
    console.error("Firestore Save Booking Error:", error);
    throw error;
  }
};

// Listen to bookings in real-time
export const listenToBookings = (onUpdate: (bookings: BookingLead[]) => void) => {
  const q = query(collection(db, 'bookings'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const bookingsList: BookingLead[] = [];
    snapshot.forEach((doc) => {
      bookingsList.push({ id: doc.id, ...doc.data() } as BookingLead);
    });
    onUpdate(bookingsList);
  }, (error: any) => {
    const isOffline = error && error.message && (
      error.message.includes('offline') || 
      error.message.includes('client is offline') ||
      error.code === 'unavailable'
    );
    if (isOffline) {
      console.warn("Firestore Listen Bookings: client is offline or database is unreachable (offline snapshot mode).");
    } else {
      console.error("Firestore Listen Bookings Error:", error);
    }
  });
};

// Update synced flag in Firestore
export const markLeadAsSynced = async (leadId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'bookings', leadId);
    await setDoc(docRef, { syncedToSheets: true }, { merge: true });
  } catch (error) {
    console.error("Firestore Mark Synced Error:", error);
  }
};

// Sheet settings persistence
export interface SheetSettings {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export const saveSheetSettings = async (settings: SheetSettings): Promise<void> => {
  try {
    await setDoc(doc(db, 'settings', 'google_sheets'), settings);
  } catch (error) {
    console.error("Firestore Save Sheet Settings Error:", error);
  }
};

export const getSheetSettings = async (): Promise<SheetSettings | null> => {
  try {
    const snap = await getDoc(doc(db, 'settings', 'google_sheets'));
    if (snap.exists()) {
      return snap.data() as SheetSettings;
    }
  } catch (error: any) {
    const isOffline = error && error.message && (
      error.message.includes('offline') || 
      error.message.includes('client is offline') ||
      error.code === 'unavailable'
    );
    if (isOffline) {
      console.warn("Firestore is offline or unreachable - using local cache/defaults:", error.message || error);
    } else {
      console.error("Firestore Get Sheet Settings Error:", error);
    }
  }
  return null;
};
