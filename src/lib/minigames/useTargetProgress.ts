'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { getFirebase } from '@/lib/firebase';
import { EMPTY_PROGRESS, mergeProgress, mergeSameDevice, normalizeProgress, type TargetProgress } from './targetProgress';

type SyncStatus = 'local' | 'conectando' | 'sincronizado' | 'pendiente' | 'error';

/** Cada dispositivo conserva sus propios contadores; nunca pisa los de otro. */
export function useTargetProgress(childId: string, game: 'target-masters' | 'fraction-fighters' = 'target-masters') {
  const prefix = `${game}-v1-`;
  const { parentId, user } = useAuth();
  const [progress, setProgress] = useState<TargetProgress>(EMPTY_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [device, setDevice] = useState<string | null>(null);
  const [snapshotState, setSnapshotState] = useState<{ scope: string; replicas: Record<string, TargetProgress> }>({ scope: '', replicas: {} });
  const [syncReady, setSyncReady] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const key = `numerario:${game}:${childId}`;
  const scope = `${parentId ?? ''}/${childId}/${game}/${device ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          try { setProgress(normalizeProgress(JSON.parse(saved))); } catch { /* Ignorar progreso local corrupto. */ }
        }
        const idKey = `${key}:device`;
        let id = localStorage.getItem(idKey);
        if (!id || !/^[a-f0-9-]{36}$/.test(id)) { id = crypto.randomUUID(); localStorage.setItem(idKey, id); }
        setDevice(id);
      } catch { /* Sin almacenamiento, el juego continúa solo en memoria. */ }
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(key, JSON.stringify(progress)); } catch { /* Solo en memoria. */ }
  }, [key, loaded, progress]);

  useEffect(() => {
    if (!parentId || !user || !device || !loaded) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    Promise.resolve().then(() => { if (!cancelled) setSyncStatus('conectando'); });
    getFirebase().then(({ db, firestore: { collection, query, where, documentId, onSnapshot } }) => {
      if (cancelled) return;
      const records = collection(db, 'parents', parentId, 'children', childId, 'records');
      const q = query(records, where(documentId(), '>=', prefix), where(documentId(), '<=', `${prefix}\uf8ff`));
      unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, snapshot => {
        if (cancelled) return;
        const data: Record<string, TargetProgress> = {};
        for (const doc of snapshot.docs) data[doc.id.slice(prefix.length)] = normalizeProgress(doc.data());
        setSnapshotState({ scope, replicas: data });
        // Antes de escribir, recuperar el máximo de la copia de este dispositivo.
        const own = data[device];
        if (own) setProgress(current => {
          const combined = mergeSameDevice(current, own);
          return JSON.stringify(normalizeProgress(current)) === JSON.stringify(combined) ? current : combined;
        });
        if (!snapshot.metadata.fromCache) setSyncReady(scope);
        setSyncStatus(previous => snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites ? 'pendiente' : previous === 'sincronizado' ? previous : 'conectando');
      }, () => { if (!cancelled) { setSyncReady(''); setSyncStatus('error'); } });
    }).catch(() => { if (!cancelled) setSyncStatus('error'); });
    return () => { cancelled = true; unsubscribe?.(); };
  }, [parentId, user, childId, device, loaded, scope, prefix]);

  useEffect(() => {
    if (!loaded || syncReady !== scope || !parentId || !user || !device) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const save = async () => {
      try {
        const { db, firestore: { doc, runTransaction } } = await getFirebase();
        if (cancelled) return;
        setSyncStatus('pendiente');
        const ref = doc(db, 'parents', parentId, 'children', childId, 'records', `${prefix}${device}`);
        await runTransaction(db, async transaction => {
          const previous = await transaction.get(ref);
          transaction.set(ref, mergeSameDevice(progress, previous.exists() ? normalizeProgress(previous.data()) : EMPTY_PROGRESS));
        });
        if (!cancelled) setSyncStatus('sincronizado');
      } catch {
        if (!cancelled) { setSyncStatus('pendiente'); retry = setTimeout(save, 5000); }
      }
    };
    void save();
    return () => { cancelled = true; if (retry) clearTimeout(retry); };
  }, [progress, loaded, syncReady, parentId, user, device, childId, scope, prefix]);

  const replicas = snapshotState.scope === scope ? snapshotState.replicas : {};
  const otherReplicas = Object.entries(replicas).filter(([id]) => id !== device).map(([, value]) => value);
  const visible = mergeProgress([progress, ...otherReplicas]);
  return { progress, setProgress, visible, loaded, syncStatus };
}
