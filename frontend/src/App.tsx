import React, { useEffect, useState } from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { useAuth } from './hooks/useAuth';
import UEList from './components/TeacherView/UEList';
import AttendanceSession from './components/TeacherView/AttendanceSession';
import PresenceConfirm from './components/StudentView/PresenceConfirm';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: 'center',
    padding: '24px',
  },
});

// Interface pour représenter une session active
interface ActiveSession {
  sessionId: string;
  ueId: string;
  ueName: string;
}

/**
 * Composant principal de l'application.
 * Gère l'authentification SSO et le routage entre vue professeur et étudiant.
 */
const App: React.FC = () => {
  const styles = useStyles();
  const { isLoading, isAuthenticated, isTeacher, error, userInfo } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [selectedUE, setSelectedUE] = useState<{ id: string; name: string } | null>(null);

  // Déterminer si l'on est dans le contexte d'une confirmation de présence
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('sessionId');
  const isStudentView = Boolean(sessionIdFromUrl);

  if (isLoading) {
    return (
      <div className={styles.centered}>
        <Spinner label="Connexion en cours..." size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <Text className={styles.errorText} size={500}>
          {error}
        </Text>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.centered}>
        <Spinner label="Authentification..." size="large" />
      </div>
    );
  }

  // Vue étudiant : confirmation de présence via Adaptive Card
  if (isStudentView && sessionIdFromUrl) {
    return (
      <div className={styles.container}>
        <PresenceConfirm sessionId={sessionIdFromUrl} userInfo={userInfo} />
      </div>
    );
  }

  // Vue professeur : vérification du rôle
  if (!isTeacher) {
    return (
      <div className={styles.centered}>
        <Text className={styles.errorText} size={500}>
          Vous n'êtes pas autorisé à utiliser cette application.
          <br />
          Seuls les professeurs ont accès à cette fonctionnalité.
        </Text>
      </div>
    );
  }

  // Vue professeur : session active ou liste des UE
  return (
    <div className={styles.container}>
      {activeSession ? (
        <AttendanceSession
          sessionId={activeSession.sessionId}
          ueId={activeSession.ueId}
          ueName={activeSession.ueName}
          onClose={() => {
            setActiveSession(null);
            setSelectedUE(null);
          }}
        />
      ) : (
        <UEList
          onStartSession={(ueId, ueName, sessionId) => {
            setSelectedUE({ id: ueId, name: ueName });
            setActiveSession({ sessionId, ueId, ueName });
          }}
        />
      )}
    </div>
  );
};

export default App;
