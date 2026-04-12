import { supabase } from '@/integrations/supabase/client';
import type { DeviceConfig } from '@/types/database';

const DEVICE_KEY = 'restaurant_device_config';

/**
 * Ensures the device has a valid anonymous Supabase session.
 * If no session exists, it signs in anonymously.
 * Returns the authenticated user's ID, which is our reliable Device ID.
 */
export async function getAuthenticatedDeviceId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return session.user.id;
  }

  // If no session, sign in anonymously
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Fatal: Device could not sign in anonymously.", error);
    return null;
  }
  return signInData.session?.user.id || null;
}

// --- Local Storage Helpers ---
// These are now secondary, used to store non-auth info like mesaNumero.

export function getDeviceConfig(): Omit<DeviceConfig, 'deviceId'> | null {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDeviceConfig(config: { mesaId: string; mesaNumero: number }): void {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(config));
}

export function clearDeviceConfig(): void {
  // We don't sign out, just clear the local mesa assignment.
  localStorage.removeItem(DEVICE_KEY);
}

export function isDeviceAssigned(): boolean {
  const config = getDeviceConfig();
  return !!config?.mesaId;
}
