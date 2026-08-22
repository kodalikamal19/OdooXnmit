# Quick Setup Guide - Dayflow HRMS Improvements

## Prerequisites
- Python 3.8+
- PostgreSQL 12+
- Node.js 16+ (for frontend)

## Backend Setup (with Improvements)

### 1. Create Virtual Environment
```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your database credentials
# Example:
# DB_NAME=odoo_hrms
# DB_USER=postgres
# DB_PASSWORD=your_secure_password
# DB_HOST=127.0.0.1
# DB_PORT=5432
```

### 4. Run Migrations
```bash
python manage.py migrate
```

### 5. Create Superuser (Optional)
```bash
python manage.py createsuperuser
```

### 6. Seed Database (if seed_data.py exists)
```bash
python manage.py shell < seed_data.py
```

### 7. Create Logs Directory
```bash
# The logs directory will be created automatically, but you can create it manually:
mkdir -p logs
chmod 755 logs
```

### 8. Run Development Server
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000`

---

## Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

---

## Environment Variables Explained

### Database Configuration
```env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=odoo_hrms           # Database name
DB_USER=postgres            # Database user
DB_PASSWORD=your_password   # Database password
DB_HOST=127.0.0.1          # Database host
DB_PORT=5432               # Database port
```

### Security Settings
```env
DEBUG=True                  # Set to False in production
SECRET_KEY=your_key        # Generate strong key for production
ALLOWED_HOSTS=localhost    # Add production domains
```

### CORS Settings
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production Security
```env
SECURE_SSL_REDIRECT=False          # Set to True in production
SESSION_COOKIE_SECURE=False        # Set to True in production
CSRF_COOKIE_SECURE=False           # Set to True in production
```

---

## API Testing

### Sign Up (Create New Company)
```bash
curl -X POST http://localhost:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Corporation",
    "name": "John Doe",
    "email": "john@acme.com",
    "phone": "555-0123",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!"
  }'
```

### Sign In
```bash
curl -X POST http://localhost:8000/api/auth/signin/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@acme.com",
    "password": "SecurePass123!"
  }'
```

### Get Current User
```bash
curl -X GET http://localhost:8000/api/auth/me/ \
  -H "Authorization: Bearer <your_access_token>"
```

---

## Troubleshooting

### Port Already in Use
```bash
# Change Django port
python manage.py runserver 8001

# Change Vite port
npm run dev -- --port 5174
```

### Database Connection Error
- Ensure PostgreSQL is running
- Check credentials in `.env`
- Verify host and port in `.env`

### Missing Logs Directory
```bash
# Create logs directory manually
mkdir -p logs
chmod 755 logs
```

### Python Dependency Issues
```bash
# Clear cache and reinstall
pip install --force-reinstall -r requirements.txt
```

### Migrations Error
```bash
# Reset migrations (development only!)
# Delete all migration files except __init__.py
# Delete the database
# Then run:
python manage.py makemigrations
python manage.py migrate
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `DEBUG=False` in `.env`
- [ ] Generate a strong `SECRET_KEY` (use: `python manage.py shell`)
  ```python
  from django.core.management.utils import get_random_secret_key
  print(get_random_secret_key())
  ```
- [ ] Update `ALLOWED_HOSTS` with your domain
- [ ] Set `SECURE_SSL_REDIRECT=True`
- [ ] Set `SESSION_COOKIE_SECURE=True`
- [ ] Set `CSRF_COOKIE_SECURE=True`
- [ ] Configure email backend (SMTP settings)
- [ ] Set up proper logging and log rotation
- [ ] Use a production WSGI server (Gunicorn, uWSGI)
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx, Apache)
- [ ] Set up monitoring and alerting
- [ ] Test all error scenarios
- [ ] Backup database regularly

---

## Monitoring & Logging

### View Recent Logs
```bash
tail -f logs/django.log
```

### Clear Old Logs
```bash
rm logs/django.log.*
```

### Check Log Size
```bash
du -sh logs/
```

---

## Common Issues & Solutions

### Issue: CORS Error in Frontend
**Solution:** Update `CORS_ALLOWED_ORIGINS` in `.env` to include your frontend URL

### Issue: 401 Unauthorized
**Solution:** Ensure token is in correct format: `Authorization: Bearer <token>`

### Issue: Slow API Response
**Solution:** 
- Check database indexes
- Enable Django query logging
- Monitor `logs/django.log`

### Issue: "Secret key not configured"
**Solution:** Ensure `.env` file exists in `backend/` directory with `SECRET_KEY` set

---

## Performance Tips

1. **Enable Query Caching:**
   Add to settings.py:
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
       }
   }
   ```

2. **Use Database Connection Pooling:**
   Consider using `django-db-geventpool` for production

3. **Enable Pagination:**
   Already configured to 50 items per page

4. **Use CDN for Static Files:**
   Configure in production deployment

---

## Additional Resources

- Django Documentation: https://docs.djangoproject.com/
- Django REST Framework: https://www.django-rest-framework.org/
- Python-dotenv: https://github.com/theskumar/python-dotenv
- React Documentation: https://react.dev/
- Vite Documentation: https://vitejs.dev/

---

**Last Updated:** 2026-08-22
**Version:** 1.0
