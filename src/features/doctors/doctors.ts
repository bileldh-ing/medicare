import { DEFAULT_WORKING_HOURS, type WorkingHours } from '@/features/appointments/slots';

import { doctorImages } from './doctorImages';

export const SPECIALTIES = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Pediatrics',
  'Dentist',
] as const;
export type Specialty = (typeof SPECIALTIES)[number];

export interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  rating: number;
  reviewsCount: number;
  experienceYears: number;
  bio: string;
  /** Square portrait for avatars and list cards; null = initials fallback. */
  avatarImage: number | null;
  /** Transparent half-body cut-out for the detail screen; null = fallback. */
  cutoutImage: number | null;
  cutoutAspect: number;
  blurhash: string | null;
  workingHours: WorkingHours;
  /** Gradient used by the initials fallback avatar. */
  gradient: [string, string];
}

type Seed = Omit<Doctor, 'avatarImage' | 'cutoutImage' | 'cutoutAspect' | 'blurhash'>;

const MON_SAT = [1, 2, 3, 4, 5, 6];
const SUN_FRI = [0, 1, 2, 3, 4, 5];

const SEED: Seed[] = [
  {
    id: 'd1',
    name: 'Dr. Ali Khan',
    specialty: 'Cardiology',
    rating: 4.9,
    reviewsCount: 190,
    experienceYears: 12,
    bio: 'Interventional cardiologist focused on preventive heart care, hypertension and cholesterol management. Known for clear explanations and calm, unhurried consultations.',
    workingHours: { ...DEFAULT_WORKING_HOURS },
    gradient: ['#4C7AD5', '#7FA3EC'],
  },
  {
    id: 'd2',
    name: 'Dr. Sofia Martins',
    specialty: 'Dermatology',
    rating: 4.8,
    reviewsCount: 264,
    experienceYears: 9,
    bio: 'Board-certified dermatologist treating acne, eczema and psoriasis, with a special interest in skin cancer screening and gentle routines for sensitive skin.',
    workingHours: { ...DEFAULT_WORKING_HOURS, days: MON_SAT },
    gradient: ['#E07A9B', '#F2A9C0'],
  },
  {
    id: 'd3',
    name: 'Dr. Karim Haddad',
    specialty: 'Neurology',
    rating: 4.7,
    reviewsCount: 142,
    experienceYears: 15,
    bio: 'Neurologist specialised in migraine, sleep disorders and epilepsy. Combines evidence-based treatment with practical lifestyle plans.',
    workingHours: { ...DEFAULT_WORKING_HOURS, days: SUN_FRI },
    gradient: ['#6A5AE0', '#9D8FF0'],
  },
  {
    id: 'd4',
    name: 'Dr. Amara Okafor',
    specialty: 'Pediatrics',
    rating: 5.0,
    reviewsCount: 318,
    experienceYears: 11,
    bio: 'Pediatrician caring for newborns to teenagers: vaccinations, growth checks, allergies and asthma. Parents love her patience and playful bedside manner.',
    workingHours: { ...DEFAULT_WORKING_HOURS },
    gradient: ['#F59E0B', '#FBC56B'],
  },
  {
    id: 'd5',
    name: 'Dr. Lucas Ferreira',
    specialty: 'Dentist',
    rating: 4.6,
    reviewsCount: 207,
    experienceYears: 8,
    bio: 'General and cosmetic dentist: check-ups, fillings, whitening and painless root canal treatment, with extra care for anxious patients.',
    workingHours: { ...DEFAULT_WORKING_HOURS, days: MON_SAT },
    gradient: ['#14B8A6', '#5EEAD4'],
  },
  {
    id: 'd6',
    name: 'Dr. Grace Adeyemi',
    specialty: 'Cardiology',
    rating: 4.9,
    reviewsCount: 233,
    experienceYears: 14,
    bio: "Cardiologist and women's heart health advocate. Focus on arrhythmias, heart failure follow-up and cardiac rehabilitation after surgery.",
    workingHours: { ...DEFAULT_WORKING_HOURS, days: MON_SAT },
    gradient: ['#3F68BC', '#6C93E3'],
  },
  {
    id: 'd7',
    name: 'Dr. Yusuf Demir',
    specialty: 'Neurology',
    rating: 4.5,
    reviewsCount: 96,
    experienceYears: 6,
    bio: 'Young neurologist with research in stroke recovery and nerve pain. Offers thorough assessments and follow-up through video consultations.',
    workingHours: { ...DEFAULT_WORKING_HOURS },
    gradient: ['#0EA5E9', '#67D3FB'],
  },
  {
    id: 'd8',
    name: 'Dr. Minh Tran',
    specialty: 'Pediatrics',
    rating: 4.8,
    reviewsCount: 175,
    experienceYears: 10,
    bio: 'Pediatrician with a focus on nutrition, child development and adolescent health. Speaks English and Vietnamese.',
    workingHours: { ...DEFAULT_WORKING_HOURS, days: SUN_FRI },
    gradient: ['#22C55E', '#86EFAC'],
  },
];

export const DOCTORS: Doctor[] = SEED.map((d) => {
  const img = doctorImages[d.id];
  return {
    ...d,
    avatarImage: img?.avatar ?? null,
    cutoutImage: img?.cutout ?? null,
    cutoutAspect: img?.cutoutAspect ?? 0.75,
    blurhash: img?.blurhash ?? null,
  };
});

const BY_ID = new Map(DOCTORS.map((d) => [d.id, d]));

export function getDoctor(id: string | undefined | null): Doctor | undefined {
  return id ? BY_ID.get(id) : undefined;
}
