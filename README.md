# TapSign - Digital Document Signing System

A comprehensive web-based signing system allowing staff to create signature requests and bosses to sign documents digitally with WhatsApp integration.

## Features

### Staff Interface (No Login Required)
- Upload PDF documents (multi-page support)
- Select boss from dropdown or manually enter boss details
- Navigate through PDF pages
- Mark multiple "Sign Here" areas across different pages using drag-to-draw
- Submit request and get shareable link
- Copy link or send directly via WhatsApp with custom message

### Boss Interface (No Login Required)
- View PDF with highlighted signature areas across all pages
- Sign using two methods:
  - Draw signature on canvas
  - Upload signature image (automatic background removal)
- Boss signs ONCE - signature automatically replicates to ALL marked areas
- Review PDF with all signatures before submitting
- Reject document with reason if needed

### Status Checking
- Staff can check signature status via unique link
- Auto-refreshes every 5 seconds
- Shows pending/signed/rejected status
- Download signed PDF when complete
- View rejection reason if rejected

### Admin Dashboard (Login Required)
- Statistics overview (total, pending, signed, rejected)
- View all sign requests in a table
- Filter by status (all/pending/signed/rejected)
- Search by staff or boss name
- Pagination support
- Download signed PDFs
- View rejection reasons

## Technology Stack

- **Backend**: Node.js 20 + Express.js
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Database**: PostgreSQL (via Prisma ORM)
- **PDF Processing**: pdf-lib
- **Image Processing**: sharp (automatic background removal)
- **Authentication**: JWT (admin only)
- **Deployment**: Docker + Dokploy

## Installation

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database
- pnpm/npm/yarn

### Local Development Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd TapSign
```

2. **Install backend dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
cd client
npm install
cd ..
```

4. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/tapsign
PORT=3000
JWT_SECRET=your-super-secret-jwt-key
STORAGE_PATH=./storage
BASE_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
```

5. **Run database migrations**
```bash
npm run db:migrate
npm run db:seed
```

6. **Start development servers**

Backend:
```bash
npm run dev
```

Frontend (in another terminal):
```bash
cd client
npm run dev
```

Visit:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Admin login: http://localhost:5173/admin/login

## Docker Deployment

### Using Docker Compose (Local)

```bash
docker-compose up -d
```

Access at http://localhost:3000

### Building for Production

```bash
docker build -t tapsign:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e JWT_SECRET=your-secret \
  -e BASE_URL=https://yourdomain.com \
  -v tapsign-storage:/app/storage \
  tapsign:latest
```

## Dokploy Deployment

### Step 1: Create Application in Dokploy

1. Log in to your Dokploy dashboard
2. Create a new application
3. Connect your GitHub repository

### Step 2: Configure Build Settings

- **Build Type**: Dockerfile
- **Dockerfile Path**: `./Dockerfile`
- **Port**: `3000`
- **Application Name**: `tapsign`

### Step 3: Configure Environment Variables

Add the following environment variables in Dokploy:

```
DATABASE_URL=<provided-by-dokploy-postgres>
PORT=3000
JWT_SECRET=<generate-secure-random-string>
STORAGE_PATH=/app/storage
BASE_URL=https://your-domain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<change-this>
```

### Step 4: Configure Database

1. Create a PostgreSQL database in Dokploy
2. Copy the DATABASE_URL from Dokploy
3. Paste it into your environment variables

### Step 5: Configure Volume Mounts

Add a volume mount for persistent file storage:
- **Mount Path**: `/app/storage`
- **Volume Name**: `tapsign-storage`

### Step 6: Deploy

Click "Deploy" and wait for the build to complete.

### Step 7: Access Your Application

Visit your assigned domain or custom domain configured in Dokploy.

## Default Admin Credentials

**Username**: `admin`  
**Password**: `changeme123`

**⚠️ IMPORTANT**: Change these credentials immediately after first login!

## API Endpoints

### Public Endpoints (No Authentication)

- `GET /api/bosses` - Get list of predefined bosses
- `POST /api/sign-requests` - Create new sign request
- `GET /api/sign-requests/:linkId` - Get request details
- `POST /api/signatures/:requestId/sign` - Submit signature
- `POST /api/signatures/:requestId/reject` - Reject document
- `GET /api/signatures/:requestId/status` - Check status
- `GET /api/signatures/:requestId/download` - Download signed PDF

### Admin Endpoints (Require JWT Token)

- `POST /api/admin/login` - Admin login
- `GET /api/admin/statistics` - Get dashboard statistics
- `GET /api/admin/requests` - Get all requests (with filters)
- `GET /api/admin/requests/:id` - Get request details

## File Structure

```
TapSign/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth context
│   │   ├── pages/          # Page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── src/                    # Node.js backend
│   ├── middleware/         # Auth middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── server.js
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.js             # Database seeding
├── storage/                # File uploads (not in git)
│   ├── pdfs/
│   └── signatures/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Usage Guide

### For Staff

1. Visit the application URL
2. Enter your name
3. Upload a PDF document
4. Select a boss from dropdown OR manually enter boss name and phone
5. Navigate through PDF pages and drag to mark "Sign Here" areas
6. Click "Submit Request"
7. Copy the link OR send via WhatsApp
8. Use the status link to check if the boss has signed

### For Bosses

1. Receive link via WhatsApp or other means
2. Open the link to view the document
3. See all marked signature areas
4. Choose to draw or upload your signature
5. Review the PDF with signatures
6. Click "Sign Document" to approve OR "Reject" with a reason

### For Admins

1. Visit `/admin/login`
2. Log in with credentials
3. View statistics dashboard
4. Filter and search requests
5. Download signed PDFs
6. View rejection reasons

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and DATABASE_URL is correct.

### File Upload Issues

Check that the storage directory exists and has write permissions:
```bash
mkdir -p storage/pdfs storage/signatures
chmod -R 755 storage
```

### Port Already in Use

Change the PORT in .env file or kill the process using the port:
```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Sharp/Image Processing Errors

If you encounter sharp errors on deployment:
```bash
npm rebuild sharp
```

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
