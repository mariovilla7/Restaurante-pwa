const SESSION_KEY = 'restaurant_mesa_session';
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours

interface MesaSession {
  mesaId: string;
  mesaNumero: number;
  timestamp: number;
}

export function getMesaSession(): MesaSession | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session: MesaSession = JSON.parse(raw);
    if (Date.now() - session.timestamp > SESSION_DURATION_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setMesaSession(mesaId: string, mesaNumero: number): void {
  const session: MesaSession = { mesaId, mesaNumero, timestamp: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearMesaSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function refreshMesaSession(): void {
  const session = getMesaSession();
  if (session) {
    session.timestamp = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
