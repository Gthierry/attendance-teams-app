import React, { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { ArrowDownloadRegular } from '@fluentui/react-icons';
import { exportAttendances } from '../../services/apiService';

interface Props {
  sessionId: string;
  ueName: string;
  token: string;
}

/**
 * Bouton d'export des présences en fichier Excel.
 * Télécharge automatiquement le fichier généré par le backend.
 */
const ExportButton: React.FC<Props> = ({ sessionId, ueName, token }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAttendances(token, sessionId);

      // Créer un lien de téléchargement et déclencher le téléchargement
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const filename = `presences_${ueName.replace(/\s+/g, '_')}_${date}.xlsx`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur lors de l\'export:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      appearance="secondary"
      icon={<ArrowDownloadRegular />}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? 'Export en cours...' : 'Exporter Excel'}
    </Button>
  );
};

export default ExportButton;
