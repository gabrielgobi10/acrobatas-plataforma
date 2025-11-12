# Acrobatas Workforce - Testing Guide

## Master Admin Credentials

To create the Master Admin account, use these credentials during registration:

- **Email**: admin@acrobatas.com
- **Password**: AcrobatasAdmin2024!
- **Admin Access Key**: acrobatas2024

## Testing Flow

### 1. Master Admin Registration

1. Open the application
2. Click on "Acesso administrativo" (small link at bottom)
3. Enter admin access key: `acrobatas2024`
4. Switch to "Cadastrar-se" tab
5. Fill in:
   - Nome Completo: Your Name
   - E-mail: admin@acrobatas.com
   - Senha: AcrobatasAdmin2024!
6. Click "Cadastrar"
7. Login with the same credentials

### 2. Professional Registration

1. Logout from admin account
2. Select "Profissional" user type
3. Click "Cadastrar-se"
4. Fill in required fields
5. Register and login

### 3. Company Registration

1. Logout
2. Select "Empresa" user type
3. Click "Cadastrar-se"
4. Fill in required fields
5. Register and login

### 4. Admin Invite System

1. Login as Master Admin
2. Go to "Administradores" tab
3. Enter email of new admin
4. Click "Enviar Convite"
5. Copy the invite link from the alert
6. Logout
7. Click "Acesso administrativo" and enter key
8. Switch to "Cadastrar-se"
9. Paste the token from the invite link
10. Complete registration

## Features to Test

### Professional Dashboard
- View available jobs
- Filter jobs by location and keyword
- Apply to jobs
- View application status
- Upload resume and profile photo
- Chat with companies
- Receive notifications

### Company Dashboard
- Create job postings
- View applications
- Accept/reject applications
- Filter professionals
- Upload company documents
- Chat with professionals
- Receive notifications

### Admin Dashboard
- View statistics
- Approve/reject job postings
- Manage professional accounts (suspend/activate)
- Manage company accounts (suspend/activate)
- Send global messages
- Invite new administrators

## Database Tables

All tables are created with RLS enabled:

- **profiles**: User accounts with roles
- **professional_profiles**: Professional-specific data
- **company_profiles**: Company-specific data
- **jobs**: Job postings
- **applications**: Job applications
- **messages**: Chat messages
- **notifications**: User notifications
- **admin_invites**: Admin invitation tokens

## Security Features

1. **Email Uniqueness**: Each email can only be registered once
2. **Role-Based Access**: Users can only access their role's dashboard
3. **Row Level Security**: Users can only see their own data
4. **Admin Invites**: Only existing admins can invite new admins
5. **Token Expiration**: Admin invite tokens expire after 48 hours
6. **Account Suspension**: Admins can suspend/activate user accounts
7. **Protected Admin Access**: Requires secret key to access admin login

## Environment Variables

Required in `.env` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_MASTER_ADMIN_EMAIL=admin@acrobatas.com
VITE_MASTER_ADMIN_PASSWORD=AcrobatasAdmin2024!
VITE_ADMIN_ACCESS_KEY=acrobatas2024
```

## Known Features

- Real-time chat with message history
- Real-time notifications
- File uploads for avatars, resumes, and documents
- Search and filter functionality
- Responsive design with hover animations
- Blue and white color scheme throughout
- Logo branding on login page and favicon
