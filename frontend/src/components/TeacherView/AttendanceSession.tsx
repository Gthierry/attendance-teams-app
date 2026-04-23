import React, { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Text,
  Button,
  Badge,
  makeStyles,
  tokens,
  Title2,
  Spinner,
  CounterBadge,
} from '@fluentui/react-components';
import { StopRegular, PersonCheckmarkRegular, ClockRegular } from '@fluentui/react-icons';
import { useAttendance } from '../../hooks/useAttendance';
import { closeSession } from '../../services/apiService';
import ExportButton from './ExportButton';

const useStyles = makeStyles({
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: '8px',
  },
  timerText: {
    fontWeight: 'bold',
    fontSize: '20px',
  },
  timerExpired: {
    color: tokens.colorPaletteRedForeground1,
  },
  timerActive: {
    color: tokens.colorPaletteGreenForeground1,
  },
  statusBadge: {
    marginBottom: '16px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  sessionId: string;
  ueId: string;
  ueName: string;
  onClose: () => void;
}

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Composant de suivi en temps réel des présences pour une session active.
 * Affiche un minuteur et la liste des étudiants ayant confirmé leur présence.
 */
const AttendanceSession: React.FC<Props> = ({ sessionId, ueId, ueName, onClose }) => {
  const styles = useStyles();
  const token = localStorage.getItem('teams_token') || '';
  const { attendances, isConnected, sessionExpired } = useAttendance(sessionId, token);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS);
  const [isClosing, setIsClosing] = useState(false);
  const [startTime] = useState(Date.now());

  // Minuteur de 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, SESSION_DURATION_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft === 0 || sessionExpired;

  const handleClose = async () => {
    try {
      setIsClosing(true);
      await closeSession(token, sessionId);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la fermeture de la session:', err);
      onClose();
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <PersonCheckmarkRegular fontSize={32} />
          <div>
            <Title2>{ueName}</Title2>
            <Text size={200}>Session: {sessionId.slice(0, 8)}...</Text>
          </div>
          <CounterBadge count={attendances.length} size="large" color="informative" />
        </div>

        <div className={styles.controls}>
          <div className={styles.timer}>
            <ClockRegular />
            <span
              className={`${styles.timerText} ${isExpired ? styles.timerExpired : styles.timerActive}`}
            >
              {isExpired ? 'Expiré' : formatTime(timeLeft)}
            </span>
          </div>

          <ExportButton sessionId={sessionId} ueName={ueName} token={token} />

          <Button
            appearance="primary"
            icon={<StopRegular />}
            onClick={handleClose}
            disabled={isClosing}
          >
            {isClosing ? 'Fermeture...' : 'Terminer la session'}
          </Button>
        </div>
      </div>

      <div className={styles.statusBadge}>
        <Badge
          appearance="filled"
          color={isConnected ? 'success' : 'danger'}
        >
          {isConnected ? '● Temps réel connecté' : '● Déconnecté'}
        </Badge>
        {isExpired && (
          <Badge appearance="filled" color="warning" style={{ marginLeft: '8px' }}>
            Session expirée - Plus de nouvelles présences acceptées
          </Badge>
        )}
      </div>

      {attendances.length === 0 ? (
        <div className={styles.emptyState}>
          <Spinner label="En attente des présences..." size="medium" />
          <br />
          <Text size={300}>
            Les étudiants reçoivent la carte de présence dans le canal Teams de l'UE.
          </Text>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Nom</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Heure de déclaration</TableHeaderCell>
              <TableHeaderCell>Statut</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendances.map((attendance) => (
              <TableRow key={attendance.id}>
                <TableCell>{attendance.studentName}</TableCell>
                <TableCell>{attendance.studentEmail}</TableCell>
                <TableCell>
                  {new Date(attendance.declaredAt).toLocaleTimeString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Badge appearance="filled" color="success">
                    Présent
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AttendanceSession;
