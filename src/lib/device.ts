import type { DeviceConfig } from '@/types/database';

const DEVICE_KEY = 'restaurant_device_config';

export function getDeviceId(): string {
  let config = getDeviceConfig();
  if (!config) {
    config = {
      deviceId: crypto.randomUUID(),
      mesaId: null,
      mesaNumero: null,
    };
    localStorage.setItem(DEVICE_KEY, JSON.stringify(config));
  }
  return config.deviceId;
}

export function getDeviceConfig(): DeviceConfig | null {
  const raw = localStorage.getItem(DEVICE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDeviceConfig(config: DeviceConfig): void {
  localStorage.setItem(DEVICE_KEY, JSON.stringify(config));
}

export function isDeviceAssigned(): boolean {
  const config = getDeviceConfig();
  return !!config?.mesaId;
}
