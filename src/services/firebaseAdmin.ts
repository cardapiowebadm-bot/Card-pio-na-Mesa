import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

const getAdminEnv = (key: string): string => {
  try {
    if (typeof process !== 'undefined' && (process as any)?.env?.[key]) {
      return (process as any).env[key];
    }
  } catch (_e) {
    // ignore
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch (_e) {
    // ignore
  }
  return '';
};

export const FIREBASE_ADMIN_PROJECT_ID = getAdminEnv('FIREBASE_PROJECT_ID') || getAdminEnv('VITE_FIREBASE_PROJECT_ID') || 'gen-lang-client-0103104761';
export const FIREBASE_ADMIN_DATABASE_ID = getAdminEnv('FIREBASE_DATABASE_ID') || getAdminEnv('VITE_FIREBASE_DATABASE_ID') || 'ai-studio-cardpionamesa-3eb2edfc-540d-4280-bd64-f82c4228f71b';

let adminAppInstance: App | null = null;
let dbInstance: Firestore | null = null;

export function getAdminApp(): App {
  if (!adminAppInstance) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminAppInstance = existingApps[0]!;
    } else {
      let credential;

      const serviceAccountKey = getAdminEnv('FIREBASE_SERVICE_ACCOUNT_KEY');
      if (serviceAccountKey && serviceAccountKey.trim() !== '') {
        try {
          const sa = JSON.parse(serviceAccountKey);
          credential = cert(sa);
          console.log('[FirebaseAdmin] Credenciais carregadas via FIREBASE_SERVICE_ACCOUNT_KEY (Service Account).');
        } catch (e: any) {
          console.error('[FirebaseAdmin] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_KEY, usando applicationDefault():', e.message);
          try {
            credential = applicationDefault();
          } catch (adcErr: any) {
            console.warn('[FirebaseAdmin] ADC indisponível:', adcErr.message);
          }
        }
      } else {
        try {
          console.log('[FirebaseAdmin] Tentando utilizar Application Default Credentials (ADC)...');
          credential = applicationDefault();
        } catch (adcErr: any) {
          console.warn('[FirebaseAdmin] ADC indisponível no ambiente local:', adcErr.message);
        }
      }

      adminAppInstance = initializeApp({
        ...(credential ? { credential } : {}),
        projectId: FIREBASE_ADMIN_PROJECT_ID
      });
    }
  }
  return adminAppInstance;
}

export function getAdminDb(): Firestore {
  if (!dbInstance) {
    const app = getAdminApp();
    dbInstance = FIREBASE_ADMIN_DATABASE_ID && FIREBASE_ADMIN_DATABASE_ID !== '(default)'
      ? getFirestore(app, FIREBASE_ADMIN_DATABASE_ID)
      : getFirestore(app);
    console.log(`[FirebaseAdmin] SDK Inicializado | Projeto Target: "${FIREBASE_ADMIN_PROJECT_ID}" | Database Target: "${FIREBASE_ADMIN_DATABASE_ID}"`);
  }
  return dbInstance;
}

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop: keyof Firestore) {
    const instance = getAdminDb();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});
