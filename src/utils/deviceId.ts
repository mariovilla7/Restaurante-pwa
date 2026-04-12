const DEVICE_ID_KEY = 'restaurant_device_id';

/**
 * Retrieves the unique device ID from localStorage.
 * If it doesn't exist, it creates a new UUID, stores it, and returns it.
 * @returns {string} The unique device ID.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}