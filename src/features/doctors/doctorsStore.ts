import { create } from 'zustand';

import { DOCTORS, type Doctor, type Specialty } from './doctors';

export type SpecialtyFilter = 'All' | Specialty;

interface DoctorsState {
  doctors: Doctor[];
  filter: SpecialtyFilter;
  setFilter: (f: SpecialtyFilter) => void;
}

/** Static catalogue + UI filter (not persisted). */
export const useDoctorsStore = create<DoctorsState>()((set) => ({
  doctors: DOCTORS,
  filter: 'All',
  setFilter: (filter) => set({ filter }),
}));

/** Popular = filtered by specialty, then by rating and review count. */
export function selectPopular(doctors: Doctor[], filter: SpecialtyFilter): Doctor[] {
  return doctors
    .filter((d) => filter === 'All' || d.specialty === filter)
    .slice()
    .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
}
