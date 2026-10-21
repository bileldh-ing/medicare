import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useBookmarksStore } from '@/features/doctors/bookmarksStore';
import type { Doctor } from '@/features/doctors/doctors';

import type { OriginRect } from './DoctorCard';

/** Shared doctor-card behaviour for Home and Search (open, bookmark, quick actions). */
export function useDoctorActions() {
  const router = useRouter();
  const toggleBookmark = useBookmarksStore((s) => s.toggle);
  const [quickDoctor, setQuickDoctor] = useState<Doctor | null>(null);

  const openDoctor = useCallback(
    (d: Doctor, origin?: OriginRect, extra?: Record<string, string>) => {
      router.push({
        pathname: '/doctor/[id]',
        params: {
          id: d.id,
          ...(origin
            ? {
                ox: String(Math.round(origin.x)),
                oy: String(Math.round(origin.y)),
                ow: String(Math.round(origin.width)),
                oh: String(Math.round(origin.height)),
              }
            : null),
          ...extra,
        },
      });
    },
    [router],
  );

  const onToggleBookmark = useCallback((d: Doctor) => toggleBookmark(d.id), [toggleBookmark]);
  const onLongPress = useCallback((d: Doctor) => setQuickDoctor(d), []);
  const closeQuick = useCallback(() => setQuickDoctor(null), []);

  return { openDoctor, onToggleBookmark, onLongPress, quickDoctor, closeQuick };
}
