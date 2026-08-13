# DTS - Document Tracking System

A full-stack Document Tracking System designed for Philippine government agencies, LGUs, and private sector offices.

## Tech Stack

- **Backend**: Laravel 11 (PHP 8.2)
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Search**: Meilisearch

## Prerequisites

- PHP 8.2+
- Composer
- Node.js & npm
- PostgreSQL 16
- Redis
- Meilisearch
- Git

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd dts-project
```

### 2. Setup Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### 3. Start Development Server

You can now start both the backend API and frontend React app concurrently using a single command from the backend folder:

```bash
cd backend
composer dev
```

## Access Points

- **Frontend**: http://localhost:3000 (or the port Vite provides)
- **Backend API**: http://127.0.0.1:8000/api
- **Meilisearch**: http://127.0.0.1:7700

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@dts.gov.ph | password |
| Encoder | encoder@dts.gov.ph | password |
| Approver | approver@dts.gov.ph | password |
| HR Head | hrhead@dts.gov.ph | password |

## Project Structure

```
dts-project/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Enums/             # Enumerations
│   │   ├── Http/Controllers/  # API Controllers
│   │   ├── Models/            # Eloquent Models
│   │   └── Providers/         # Service Providers
│   ├── config/                # Configuration files
│   ├── database/              # Migrations & Seeders
│   └── routes/                # API Routes
│
└── frontend/                   # React Application
    ├── src/
    │   ├── components/        # Reusable components
    │   ├── pages/             # Page components
    │   ├── services/          # API services
    │   ├── stores/            # State management
    │   └── types/             # TypeScript types
    └── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/{id}` - Get document
- `PUT /api/documents/{id}` - Update document
- `POST /api/documents/{id}/route` - Route document

### Offices
- `GET /api/offices` - List offices
- `POST /api/offices` - Create office
- `GET /api/offices/{id}` - Get office

### Reports
- `GET /api/reports/dashboard` - Dashboard stats
- `GET /api/reports/turnaround` - Turnaround time
- `GET /api/reports/bottlenecks` - Bottleneck analysis
- `GET /api/reports/volume` - Volume reports

## Development

### Development Server
Run both the frontend and backend servers concurrently:
```bash
composer dev
```

# Access tinker
php artisan tinker

# Clear cache
php artisan cache:clear
```

### Frontend commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## Synology NAS Deployment

A Synology-ready Docker Compose file is provided. See [`SYNLOGY_DEPLOY.md`](SYNLOGY_DEPLOY.md) for the full step-by-step guide.

Quick start:

```bash
# 1. Copy the template and edit your NAS IP / passwords
cp .env.synology .env

# 2. Build and start (APP_KEY is auto-generated on first run)
docker compose -f docker-compose.synology.yml up -d --build

# 3. Run migrations
docker compose -f docker-compose.synology.yml exec backend php artisan migrate --force
```

## License

Proprietary - Government Use Only
