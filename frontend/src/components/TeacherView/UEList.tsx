import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Spinner,
  makeStyles,
  tokens,
  Title2,
  Badge,
} from '@fluentui/react-components';
import { BookRegular, PlayCircleRegular } from '@fluentui/react-icons';
import { fetchUEs, startSession, UE } from '../../services/apiService';

const useStyles = makeStyles({
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
    ':hover': {
      boxShadow: tokens.shadow8,
    },
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '12px',
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    color: tokens.colorNeutralForeground3,
  },
});

interface Props {
  onStartSession: (ueId: string, ueName: string, sessionId: string) => void;
}

/**
 * Composant affichant la liste des UE du professeur.
 * Permet de démarrer une session de présence pour chaque UE.
 */
const UEList: React.FC<Props> = ({ onStartSession }) => {
  const styles = useStyles();
  const [ues, setUes] = useState<UE[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState<string | null>(null);

  const token = localStorage.getItem('teams_token') || '';

  useEffect(() => {
    const loadUEs = async () => {
      try {
        setIsLoading(true);
        const data = await fetchUEs(token);
        setUes(data);
      } catch (err) {
        setError('Impossible de charger les UE. Veuillez réessayer.');
        console.error('Erreur lors du chargement des UE:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUEs();
  }, [token]);

  const handleStartSession = async (ue: UE) => {
    try {
      setStartingSession(ue.id);
      const session = await startSession(token, ue.id, ue.displayName);
      onStartSession(ue.id, ue.displayName, session.id);
    } catch (err) {
      setError(`Impossible de démarrer la session pour ${ue.displayName}.`);
      console.error('Erreur lors du démarrage de la session:', err);
    } finally {
      setStartingSession(null);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner label="Chargement des UE..." size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Text className={styles.errorText}>{error}</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BookRegular fontSize={32} />
        <Title2>Mes Unités d'Enseignement</Title2>
        <Badge appearance="filled" color="informative">
          {ues.length} UE
        </Badge>
      </div>

      {ues.length === 0 ? (
        <div className={styles.emptyState}>
          <Text size={400}>Aucune UE trouvée.</Text>
          <br />
          <Text size={300}>Vérifiez que vous êtes membre de groupes M365 avec le préfixe "UE-".</Text>
        </div>
      ) : (
        <div className={styles.grid}>
          {ues.map((ue) => (
            <Card key={ue.id} className={styles.card}>
              <CardHeader
                image={<BookRegular fontSize={24} />}
                header={<Text weight="semibold">{ue.displayName}</Text>}
                description={<Text size={200}>ID: {ue.id.slice(0, 8)}...</Text>}
              />
              <div className={styles.cardActions}>
                <Button
                  appearance="primary"
                  icon={<PlayCircleRegular />}
                  onClick={() => handleStartSession(ue)}
                  disabled={startingSession !== null}
                >
                  {startingSession === ue.id ? 'Démarrage...' : 'Lancer la présence'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UEList;
