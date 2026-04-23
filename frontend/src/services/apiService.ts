import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Crée une instance axios avec le token d'authentification.
 */
const createApiClient = (token: string) => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export interface UE {
  id: string;
  displayName: string;
}

export interface Session {
  id: string;
  ueId: string;
  ueName: string;
  profId: string;
  startedAt: string;
  expiresAt: string;
  closedAt?: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  declaredAt: string;
}

/**
 * Récupère la liste des UE du professeur depuis le backend.
 */
export const fetchUEs = async (token: string): Promise<UE[]> => {
  const client = createApiClient(token);
  const response = await client.get<UE[]>('/api/ue');
  return response.data;
};

/**
 * Démarre une nouvelle session de présence pour une UE donnée.
 */
export const startSession = async (token: string, ueId: string, ueName: string): Promise<Session> => {
  const client = createApiClient(token);
  const response = await client.post<Session>('/api/attendance/session', { ueId, ueName });
  return response.data;
};

/**
 * Ferme une session de présence.
 */
export const closeSession = async (token: string, sessionId: string): Promise<void> => {
  const client = createApiClient(token);
  await client.patch(`/api/attendance/session/${sessionId}/close`);
};

/**
 * Récupère la liste des présences pour une session.
 */
export const fetchAttendances = async (token: string, sessionId: string): Promise<Attendance[]> => {
  const client = createApiClient(token);
  const response = await client.get<Attendance[]>(`/api/attendance/session/${sessionId}`);
  return response.data;
};

/**
 * Déclare la présence d'un étudiant.
 */
export const declarePresence = async (
  token: string,
  sessionId: string,
  studentInfo: { studentId: string; studentName: string; studentEmail: string }
): Promise<Attendance> => {
  const client = createApiClient(token);
  const response = await client.post<Attendance>(`/api/attendance/declare`, {
    sessionId,
    ...studentInfo,
  });
  return response.data;
};

/**
 * Exporte les présences d'une session en Excel.
 */
export const exportAttendances = async (token: string, sessionId: string): Promise<Blob> => {
  const client = createApiClient(token);
  const response = await client.get(`/api/export/${sessionId}`, {
    responseType: 'blob',
  });
  return response.data;
};
