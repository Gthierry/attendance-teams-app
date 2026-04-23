import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  declaredAt: string;
}

interface AttendanceState {
  attendances: Attendance[];
  isConnected: boolean;
  sessionExpired: boolean;
}

/**
 * Hook de gestion des présences en temps réel via Socket.io.
 * Écoute les événements du serveur pour mettre à jour la liste des présences.
 */
export const useAttendance = (sessionId: string, token: string | null): AttendanceState => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!sessionId || !token) return;

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    // Connexion au serveur Socket.io avec authentification
    const newSocket = io(apiUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Rejoindre la salle de la session
      newSocket.emit('join:session', sessionId);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Écouter les nouvelles présences
    newSocket.on('attendance:new', (attendance: Attendance) => {
      setAttendances((prev) => {
        // Éviter les doublons
        if (prev.some((a) => a.studentId === attendance.studentId)) {
          return prev;
        }
        return [...prev, attendance];
      });
    });

    // Écouter l'expiration de la session
    newSocket.on('session:expired', () => {
      setSessionExpired(true);
    });

    // Charger les présences existantes
    newSocket.on('attendance:list', (list: Attendance[]) => {
      setAttendances(list);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, token]);

  return { attendances, isConnected, sessionExpired };
};
