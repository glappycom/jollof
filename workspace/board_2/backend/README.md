# Backend (FastAPI Bookings)

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```

## Endpoints

- GET /health
- CRUD /appointments
- CRUD /services
- CRUD /staff
