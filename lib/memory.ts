import { TravelDNA, PersonalityProfile } from "@/types/travel";
import { TripPlan, PipelineResult } from "@/types/plan";

// ============================================================
// Keys
// ============================================================

const KEYS = {
  DNA: "travel-dna",
  PROFILE: "travel-profile",
  HISTORY: "travel-history",
  LAST_TRIP: "travel-last-trip",
  LAST_DESTINATION: "travel-last-destination",
  FAVORITES: "travel-favorites",
} as const;

// ============================================================
// Travel History Entry
// ============================================================

export interface HistoryEntry {
  id: string;
  createdAt: string;
  destination: string;
  days: number;
  dna: TravelDNA;
  selectedPlan?: TripPlan;
  result?: PipelineResult;
}

// ============================================================
// Public API
// ============================================================

export const Memory = {
  // --- DNA ---
  getDNA(): TravelDNA | null {
    return read<TravelDNA>(KEYS.DNA);
  },
  saveDNA(dna: TravelDNA) {
    write(KEYS.DNA, dna);
  },
  hasDNA(): boolean {
    return read(KEYS.DNA) !== null;
  },

  // --- Profile ---
  getProfile(): PersonalityProfile | null {
    return read<PersonalityProfile>(KEYS.PROFILE);
  },
  saveProfile(profile: PersonalityProfile) {
    write(KEYS.PROFILE, profile);
  },

  // --- History ---
  getHistory(): HistoryEntry[] {
    return read<HistoryEntry[]>(KEYS.HISTORY) || [];
  },
  addToHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
    const history = this.getHistory();
    history.unshift({
      ...entry,
      id: "h_" + Date.now(),
      createdAt: new Date().toISOString(),
    });
    // Keep only last 20 entries
    write(KEYS.HISTORY, history.slice(0, 20));
  },

  // --- Last Trip (for quick resume) ---
  saveLastTrip(plan: TripPlan, destination: string) {
    write(KEYS.LAST_TRIP, plan);
    write(KEYS.LAST_DESTINATION, destination);
  },
  getLastTrip(): { plan: TripPlan; destination: string } | null {
    const plan = read<TripPlan>(KEYS.LAST_TRIP);
    const destination = read<string>(KEYS.LAST_DESTINATION);
    if (plan && destination) return { plan, destination };
    return null;
  },

  // --- Favorites ---
  getFavorites(): string[] {
    return read<string[]>(KEYS.FAVORITES) || [];
  },
  toggleFavorite(destination: string) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(destination);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(destination);
    write(KEYS.FAVORITES, favs);
  },
  isFavorite(destination: string): boolean {
    return this.getFavorites().includes(destination);
  },

  // --- Clear ---
  clearAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

// ============================================================
// Helpers
// ============================================================

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or disabled — silently fail
  }
}
