import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  makeStyles,
  tokens,
  Title2,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import { CheckmarkCircleRegular, DismissCircleRegular } from '@fluentui/react-icons';
import * as microsoftTeams from '@microsoft/teams-js';
import { declarePresence } from '../../services/apiService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '16px',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    padding: '24px',
    textAlign: 'center',
  },
  title: {
    marginBottom: '16px',
  },
  description: {
    marginBottom: '24px',
    color: tokens.colorNeutralForeground2,
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '18px',
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
    fontSize: '64px',
    marginBottom: '16px',
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: '64px',
    marginBottom: '16px',
  },
});

interface UserInfo {
  id: string;
  displayName: string;
  email: string;
  token: string;
}

interface Props {
  sessionId: string;
  userInfo: UserInfo | null;
}

type PresenceState = 'idle' | 'loading' | 'success' | 'error' | 'expired';

/**
 * Composant de confirmation de présence pour les étudiants.
 * Accessible depuis l'Adaptive Card envoyée dans le canal Teams.
 */
const PresenceConfirm: React.FC<Props> = ({ sessionId, userInfo }) => {
  const styles = useStyles();
  const [state, setState] = useState<PresenceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleConfirmPresence = async () => {
    if (!userInfo) {
      setState('error');
      setErrorMessage('Impossible d\'identifier l\'utilisateur.');
      return;
    }

    try {
      setState('loading');
      await declarePresence(userInfo.token, sessionId, {
        studentId: userInfo.id,
        studentName: userInfo.displayName,
        studentEmail: userInfo.email,
      });
      setState('success');

      // Notifier Teams que l'action est complète
      try {
        await microsoftTeams.app.initialize();
        microsoftTeams.dialog.url.submit({ success: true });
      } catch {
        // Ignore si pas dans un contexte Teams Dialog
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 410) {
        setState('expired');
        setErrorMessage('La fenêtre de présence de 5 minutes est expirée.');
      } else if (axiosError.response?.status === 409) {
        setState('error');
        setErrorMessage('Vous avez déjà déclaré votre présence pour cette session.');
      } else {
        setState('error');
        setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
      }
      console.error('Erreur lors de la déclaration de présence:', err);
    }
  };

  if (state === 'success') {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <CheckmarkCircleRegular className={styles.successIcon} />
          <Title2 className={styles.title}>Présence confirmée !</Title2>
          <Text className={styles.description}>
            Votre présence a été enregistrée avec succès.
          </Text>
          <Badge appearance="filled" color="success" size="large">
            ✅ Présent
          </Badge>
        </Card>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <DismissCircleRegular className={styles.errorIcon} />
          <Title2 className={styles.title}>Délai expiré</Title2>
          <Text className={styles.description}>{errorMessage}</Text>
          <Badge appearance="filled" color="warning" size="large">
            ⏰ Trop tard
          </Badge>
        </Card>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={styles.container}>
        <Card className={styles.card}>
          <DismissCircleRegular className={styles.errorIcon} />
          <Title2 className={styles.title}>Erreur</Title2>
          <Text className={styles.description}>{errorMessage}</Text>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <Title2 className={styles.title}>Confirmation de présence</Title2>
        <Text className={styles.description}>
          Cliquez sur le bouton ci-dessous pour confirmer votre présence au cours.
          Vous avez <strong>5 minutes</strong> pour confirmer.
        </Text>
        <Button
          appearance="primary"
          size="large"
          className={styles.button}
          onClick={handleConfirmPresence}
          disabled={state === 'loading'}
          icon={state === 'loading' ? <Spinner size="tiny" /> : <CheckmarkCircleRegular />}
        >
          {state === 'loading' ? 'Enregistrement...' : '✅ Je suis présent'}
        </Button>
      </Card>
    </div>
  );
};

export default PresenceConfirm;
