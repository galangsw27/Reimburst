# Reimbursement Application

A Next.js-based reimbursement management system with support for both mock data and PostgreSQL database modes.

## Features

- User management with role-based hierarchy (head, finance, lead, user)
- Reimbursement submission and approval workflow
- Dual-mode operation: mock data or PostgreSQL database
- Docker-based PostgreSQL setup for local development
- RESTful API routes for data operations

## Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for database mode)
- Git

## Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd reimbursement-app
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:

#### Database Configuration

- **DATABASE_MODE**: Controls whether the application uses mock data or a real database
  - `mock`: Uses hardcoded mock data (no database required)
  - `database`: Uses PostgreSQL database (requires Docker setup)
  - Default: `mock`

- **DATABASE_URL**: PostgreSQL connection string (required when `DATABASE_MODE=database`)
  - Format: `postgresql://username:password@host:port/database_name`
  - Default for local Docker: `postgresql://postgres:postgres@localhost:5432/reimbursement_db`

Example `.env` configuration:

```env
# For mock mode (no database required)
DATABASE_MODE=mock

# For database mode
DATABASE_MODE=database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reimbursement_db
```

### 3. Docker Setup (Required for Database Mode)

If you want to use the PostgreSQL database instead of mock data, follow these steps:

#### Install Docker Desktop

1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop
3. Verify Docker is running:

```bash
docker --version
docker-compose --version
```

#### Start PostgreSQL Container

The project includes a `docker-compose.yml` file that sets up PostgreSQL 15 with all necessary configurations.

```bash
# Start the PostgreSQL container
docker-compose up -d

# Verify the container is running
docker ps

# Check container logs
docker-compose logs postgres
```

The PostgreSQL container will:
- Run on port 5432
- Create a database named `reimbursement_db`
- Automatically initialize tables and indexes using `scripts/init.sql`
- Persist data in a Docker volume named `postgres_data`

#### Database Schema

The database includes two main tables:

**Users Table:**
- `id`: Serial primary key
- `name`: User's full name
- `email`: Unique email address
- `password_hash`: Hashed password
- `role`: User role (head, finance, lead, user)
- `lead_id`: Foreign key to users table (for user hierarchy)
- `created_at`, `updated_at`: Timestamps

**Reimbursements Table:**
- `id`: Serial primary key
- `user_id`: Foreign key to users table
- `amount`: Reimbursement amount (decimal)
- `description`: Reimbursement description
- `status`: Status (pending, approved, rejected)
- `submission_date`: Date submitted
- `approval_date`: Date approved/rejected
- `created_at`, `updated_at`: Timestamps

#### Seed the Database

After starting the container, seed the database with initial user data:

```bash
# Run the seed script (to be implemented in task 12)
npm run seed
```

This will populate the database with:
- 1 head user
- 1 finance user
- 3 lead users
- 13 regular users

#### Stop and Manage Docker Container

```bash
# Stop the container
docker-compose down

# Stop and remove all data (WARNING: deletes all database data)
docker-compose down -v

# Restart the container
docker-compose restart

# View container logs
docker-compose logs -f postgres
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Switch Between Mock and Database Modes

You can easily switch between mock and database modes by changing the `DATABASE_MODE` environment variable:

**Option 1: Edit .env file**

```env
# Use mock data
DATABASE_MODE=mock

# Use database
DATABASE_MODE=database
```

**Option 2: Set environment variable when running**

```bash
# Run with mock mode
DATABASE_MODE=mock npm run dev

# Run with database mode
DATABASE_MODE=database npm run dev
```

## API Routes

The application provides the following API endpoints:

### Users

- `GET /api/users` - Get all users
- `GET /api/users/[id]` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/[id]` - Update user

### Reimbursements

- `GET /api/reimbursements` - Get all reimbursements
- `POST /api/reimbursements` - Create new reimbursement
- `PUT /api/reimbursements/[id]` - Update reimbursement status

### Health Check

- `GET /api/health` - Check application and database health

## Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # React components
├── lib/                   # Library code
│   ├── config/           # Configuration modules
│   ├── database/         # Database connection and utilities
│   ├── services/         # Service layer (mock and database)
│   └── utils/            # Utility functions
├── scripts/              # Database scripts
│   └── init.sql          # Database initialization
├── docker-compose.yml    # Docker configuration
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Docker Issues

**Container won't start:**
- Ensure Docker Desktop is running
- Check if port 5432 is already in use: `lsof -i :5432`
- View container logs: `docker-compose logs postgres`

**Database connection errors:**
- Verify the container is running: `docker ps`
- Check DATABASE_URL in .env matches the container configuration
- Ensure DATABASE_MODE is set to "database"

**Permission errors:**
- On Linux, you may need to run Docker commands with `sudo`
- Or add your user to the docker group: `sudo usermod -aG docker $USER`

### Application Issues

**Environment variables not loading:**
- Restart the development server after changing .env
- Verify .env file exists and is not named .env.example
- Check for typos in variable names

**Mock mode not working:**
- Ensure DATABASE_MODE is set to "mock" (or not set at all)
- Restart the development server

**Database mode not working:**
- Verify Docker container is running
- Check DATABASE_URL is correct
- Ensure database has been seeded with initial data

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[Your License Here]
