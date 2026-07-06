# Jollof Workspace

This workspace contains both backend and mobile starters.

## Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn app.main:app --reload
```

## Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```
