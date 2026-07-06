# Backend (FastAPI Bookings)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```

## Tenant Setup

Create a tenant:

```bash
curl -X POST http://127.0.0.1:8000/api/tenants \
  -H "Content-Type: application/json" \
  -d "{\"display_name\":\"Demo Salon\",\"handle\":\"demo-salon\",\"recipe\":\"salon\"}"
```

Open tenant docs:

```
http://127.0.0.1:8000/b/demo-salon/docs
```

## Endpoints

- GET /health
- POST /api/tenants
- GET /api/tenants/{handle}
- GET /b/{handle}/admin/meta
- CRUD /b/{handle}/customers
- CRUD /b/{handle}/appointments
- CRUD /b/{handle}/services
- CRUD /b/{handle}/staff
