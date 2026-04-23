# 📋 Attendance Teams App

Application Microsoft Teams de gestion des présences pour des cours universitaires (Unités d'Enseignement).

## 🎯 Fonctionnalités

- **Authentification SSO** via Microsoft 365 (Teams JS SDK + MSAL)
- **Vérification du rôle** professeur via les groupes M365 (préfixe `PROF-`)
- **Liste des UE** récupérées depuis les groupes M365 (préfixe `UE-`)
- **Adaptive Card** envoyée dans le canal Teams pour la confirmation de présence
- **Fenêtre de 5 minutes** pour déclarer sa présence
- **Temps réel** via Socket.io (le prof voit les présences s'actualiser en direct)
- **Export Excel** de la liste des présents

## 🏗️ Architecture

```
attendance-teams-app/
├── frontend/     # Onglet Teams (React + Fluent UI v9)
├── backend/      # API REST (Node.js + Express + Prisma)
├── bot/          # Bot Teams (Adaptive Cards)
├── database/     # Migrations SQL
├── manifest/     # Manifest Teams App
└── infra/        # Docker Compose
```

## 🔧 Prérequis

- **Node.js** v18+ et npm v9+
- **Docker** et Docker Compose
- **Compte Microsoft 365** développeur (Programme développeur M365)
- **Azure CLI** (optionnel, pour le déploiement)
- **ngrok** ou tunnel similaire pour les tests locaux

## 🚀 Installation

### 1. Cloner et configurer l'environnement

```bash
git clone https://github.com/Gthierry/attendance-teams-app.git
cd attendance-teams-app

# Copier et remplir le fichier d'environnement
cp .env.example .env
# Éditez .env avec vos valeurs Azure AD
```

### 2. Démarrer la base de données (Docker)

```bash
cd infra
docker-compose up -d sqlserver
# Attendre que SQL Server soit prêt (~30 secondes)
```

### 3. Installer et démarrer le backend

```bash
cd backend
npm install

# Générer le client Prisma et appliquer les migrations
npx prisma generate
npx prisma migrate dev --name init

# Démarrer en développement
npm run dev
# → Backend disponible sur http://localhost:3000
```

### 4. Installer et démarrer le bot

```bash
cd bot
npm install
npm run dev
# → Bot disponible sur http://localhost:3978
```

### 5. Installer et démarrer le frontend

```bash
cd frontend
npm install
npm start
# → Frontend disponible sur http://localhost:3001
```

## ⚙️ Configuration Azure AD

### 1. Enregistrer l'application Azure AD

1. Allez dans [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Cliquez **New registration**
3. Remplissez :
   - **Name** : `Attendance Teams App`
   - **Supported account types** : `Accounts in this organizational directory only`
   - **Redirect URI** : `https://your-domain/auth/callback`

### 2. Permissions Microsoft Graph requises

Ajoutez ces **Delegated permissions** dans **API permissions** :

| Permission | Description |
|-----------|-------------|
| `User.Read` | Lire le profil de l'utilisateur connecté |
| `GroupMember.Read.All` | Lire les appartenances aux groupes |
| `Team.ReadBasic.All` | Lire les informations des équipes Teams |
| `ChannelMessage.Send` | Envoyer des messages dans les canaux |

> ⚠️ N'oubliez pas de cliquer **Grant admin consent** pour les permissions.

### 3. Configurer le SSO Teams

Dans **Expose an API** :
1. Définissez l'**Application ID URI** : `api://votre-domaine/AZURE_CLIENT_ID`
2. Ajoutez un **scope** : `access_as_user`
3. Autorisez les applications Teams :
   - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams mobile/desktop)
   - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web)

### 4. Créer un secret client

Dans **Certificates & secrets** → **New client secret**, copiez la valeur dans `.env`.

## 🤖 Configuration du Bot Teams

### 1. Créer le Bot dans Azure

1. [Azure Portal](https://portal.azure.com) → **Create a resource** → **Azure Bot**
2. Remplissez les informations
3. Dans **Configuration** → **Messaging endpoint** : `https://votre-domaine/api/messages`
4. Notez le **Bot ID** (App ID)

### 2. Configurer dans Teams Developer Portal

1. [Teams Developer Portal](https://dev.teams.microsoft.com) → **Apps** → votre app
2. Dans **App features** → **Bot** : entrez le Bot ID

## 📦 Déploiement du Manifest Teams

### 1. Préparer le manifest

```bash
cd manifest
# Remplacez les variables dans manifest.json :
# {{TEAMS_APP_ID}} → UUID généré
# {{BOT_ID}} → votre Bot ID
# {{AZURE_CLIENT_ID}} → votre Client ID
# {{FRONTEND_URL}} → URL de votre frontend déployé
# {{APP_DOMAIN}} → votre domaine (sans https://)
```

### 2. Créer le package Teams

```bash
cd manifest
zip -r attendance-teams-app.zip manifest.json color.png outline.png
```

### 3. Installer dans Teams

1. Teams → **Apps** → **Manage your apps** → **Upload a custom app**
2. Sélectionnez le fichier `attendance-teams-app.zip`
3. Installez dans une équipe ou en personnel

## 🗄️ Schéma de base de données

```sql
-- Sessions de présence
sessions:
  id          UUID (PK)
  ue_id       String   -- ID groupe M365
  ue_name     String
  prof_id     String   -- ID M365 du prof
  started_at  DateTime
  expires_at  DateTime -- started_at + 5 min
  closed_at   DateTime?

-- Présences enregistrées
attendances:
  id            UUID (PK)
  session_id    UUID (FK -> sessions)
  student_id    String   -- ID M365 étudiant
  student_name  String
  student_email String
  declared_at   DateTime
```

## 🧪 Tests locaux avec ngrok

Pour tester le bot Teams en local, vous avez besoin d'un tunnel HTTPS :

```bash
# Installer ngrok
npm install -g ngrok

# Exposer le bot
ngrok http 3978

# Mettre à jour le Messaging Endpoint du bot dans Azure avec l'URL ngrok
# ex: https://abc123.ngrok.io/api/messages
```

## 📁 Structure des groupes M365

L'application utilise la convention de nommage suivante pour les groupes M365 :

| Préfixe | Rôle |
|---------|------|
| `PROF-` | Groupe professeurs (ex: `PROF-INFO`, `PROF-MATHS`) |
| `UE-` | Unité d'enseignement (ex: `UE-ALGO-L1`, `UE-RESEAU-L3`) |

> Un utilisateur est reconnu comme **professeur** s'il est membre d'au moins un groupe `PROF-*`.
> Les **UE disponibles** sont les groupes `UE-*` dont le prof est membre.

## 🔐 Sécurité

- Les tokens JWT Azure AD sont **validés côté backend** via les clés publiques JWKS
- Les tokens ne sont **jamais stockés** côté serveur
- Les requêtes API nécessitent un token valide (middleware d'authentification)
- Les étudiants ne peuvent déclarer leur présence qu'**une seule fois** par session
- La fenêtre de présence est limitée à **5 minutes** et contrôlée côté serveur

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
