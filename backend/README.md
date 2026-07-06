# Jollof IDE Engine Room (Backend)

## Setup

```bash
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload
```

## Tests

```bash
pytest
```

## Tenant Handles

Check handle availability:

```bash
curl -X POST http://127.0.0.1:8000/api/handles/check ^
  -H "Content-Type: application/json" ^
  -d "{\"display_name\":\"Igbudu Beauty Lounge\",\"preferred_handle\":\"igbudu-beauty-lounge\",\"city\":\"Warri\"}"
```

Create tenant:

```bash
curl -X POST http://127.0.0.1:8000/api/tenants ^
  -H "Content-Type: application/json" ^
  -d "{\"display_name\":\"Igbudu Beauty Lounge\",\"recipe\":\"salon\"}"
```

Get tenant:

```bash
curl http://127.0.0.1:8000/api/tenants/igbudu-beauty-lounge
```
