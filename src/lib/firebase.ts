import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress noisy internal @firebase/firestore offline/timeout console.error logs
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.warn('[Firebase Firestore] Handled error:', JSON.stringify(errInfo));
  return errInfo;
}

// Connection test as required by skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase Firestore] Real-time connection validated.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase Firestore] Client is offline, cached persistence active.');
    }
    return false;
  }
}

// Fetch master catalog once from Firestore
export async function fetchMasterCatalogFromFirestore(): Promise<{
  anime: any[];
  movies: any[];
  heroBanners: any[];
  homepageSections: any[];
  categories: any[];
  genres: any[];
  settings: any;
} | null> {
  try {
    const catalogDocRef = doc(db, 'catalog', 'master');
    const snapshot = await getDoc(catalogDocRef);
    if (snapshot.exists()) {
      const raw = snapshot.data();
      return {
        anime: Array.isArray(raw.anime) ? raw.anime : [],
        movies: Array.isArray(raw.movies) ? raw.movies : [],
        heroBanners: Array.isArray(raw.hero_banners) ? raw.hero_banners : [],
        homepageSections: Array.isArray(raw.homepage_sections) ? raw.homepage_sections : [],
        categories: Array.isArray(raw.categories) ? raw.categories : [],
        genres: Array.isArray(raw.genres) ? raw.genres : [],
        settings: raw.settings || null
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'catalog/master');
    return null;
  }
}

// Real-time catalog subscription
export function subscribeToCatalog(
  onData: (data: {
    anime: any[];
    movies: any[];
    heroBanners: any[];
    homepageSections: any[];
    categories: any[];
    genres: any[];
    settings: any;
  }) => void
) {
  try {
    const catalogDocRef = doc(db, 'catalog', 'master');
    const unsubscribe = onSnapshot(
      catalogDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data();
          onData({
            anime: Array.isArray(raw.anime) ? raw.anime : [],
            movies: Array.isArray(raw.movies) ? raw.movies : [],
            heroBanners: Array.isArray(raw.hero_banners) ? raw.hero_banners : [],
            homepageSections: Array.isArray(raw.homepage_sections) ? raw.homepage_sections : [],
            categories: Array.isArray(raw.categories) ? raw.categories : [],
            genres: Array.isArray(raw.genres) ? raw.genres : [],
            settings: raw.settings || null
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'catalog/master');
      }
    );
    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'catalog/master');
    return () => {};
  }
}

// Deep-clean undefined properties before sending to Firestore
function sanitizeForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Push master catalog to Firestore
export async function pushMasterCatalogToFirestore(catalogData: {
  anime?: any[];
  movies?: any[];
  hero_banners?: any[];
  homepage_sections?: any[];
  categories?: any[];
  genres?: any[];
  settings?: any;
}) {
  try {
    const catalogDocRef = doc(db, 'catalog', 'master');
    const cleanData = sanitizeForFirestore({
      ...catalogData,
      last_updated_at: new Date().toISOString()
    });
    await setDoc(catalogDocRef, cleanData, { merge: true });
    console.log('[Firebase Firestore] Real-time master catalog synchronized.');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'catalog/master');
  }
}
