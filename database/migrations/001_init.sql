-- Migration initiale : création des tables de l'application de présences Teams
-- Base de données : SQL Server 2022

-- Création de la table des sessions de présence
CREATE TABLE sessions (
    id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ue_id         NVARCHAR(255) NOT NULL,
    ue_name       NVARCHAR(255) NOT NULL,
    prof_id       NVARCHAR(255) NOT NULL,
    started_at    DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
    expires_at    DATETIME2     NOT NULL,
    closed_at     DATETIME2     NULL,
    CONSTRAINT CHK_expires_after_start CHECK (expires_at > started_at)
);

-- Index pour les requêtes fréquentes sur les sessions
CREATE INDEX IX_sessions_prof_id    ON sessions(prof_id);
CREATE INDEX IX_sessions_ue_id      ON sessions(ue_id);
CREATE INDEX IX_sessions_started_at ON sessions(started_at DESC);

-- Création de la table des présences enregistrées
CREATE TABLE attendances (
    id            UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    session_id    UNIQUEIDENTIFIER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id    NVARCHAR(255)    NOT NULL,
    student_name  NVARCHAR(255)    NOT NULL,
    student_email NVARCHAR(255)    NOT NULL,
    declared_at   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT UQ_attendance_per_session UNIQUE (session_id, student_id)
);

-- Index pour les requêtes fréquentes sur les présences
CREATE INDEX IX_attendances_session_id  ON attendances(session_id);
CREATE INDEX IX_attendances_student_id  ON attendances(student_id);
CREATE INDEX IX_attendances_declared_at ON attendances(declared_at DESC);
