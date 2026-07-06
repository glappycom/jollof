from typing import Any, Dict, List

RECIPES: Dict[str, Dict[str, Any]] = {
    "bookings": {
        "keywords": ["book", "booking", "reservation", "schedule", "appointment", "calendar"],
        "requirements": {
            "domain": "bookings",
            "features": ["availability", "booking flow", "notifications"],
        },
        "questions": [
            "What type of bookings are you managing (services, rooms, events)?",
            "Do you need staff or resource availability syncing?",
            "What notification channels do you want (email, sms, whatsapp)?",
        ],
        "architecture": {
            "services": ["booking-service", "notification-service"],
            "storage": "sqlite",
        },
        "tasks": [
            {"id": "bk-1", "title": "Model core booking entities", "status": "todo"},
            {"id": "bk-2", "title": "Design booking workflow", "status": "todo"},
            {"id": "bk-3", "title": "Integrate notifications", "status": "todo"},
        ],
        "scaffold_files": [
            "backend/app/services/booking_service.py",
            "backend/app/schemas/booking.py",
            "backend/app/api/booking_routes.py",
        ],
    },
    "commerce": {
        "keywords": ["shop", "store", "commerce", "checkout", "cart", "product"],
        "requirements": {
            "domain": "commerce",
            "features": ["catalog", "cart", "checkout"],
        },
        "questions": [
            "What products are you selling (digital, physical, services)?",
            "Which payment providers do you need?",
            "Do you need inventory tracking?",
        ],
        "architecture": {
            "services": ["catalog-service", "checkout-service"],
            "storage": "sqlite",
        },
        "tasks": [
            {"id": "cm-1", "title": "Model product catalog", "status": "todo"},
            {"id": "cm-2", "title": "Design cart and checkout flow", "status": "todo"},
            {"id": "cm-3", "title": "Define payment integration", "status": "todo"},
        ],
        "scaffold_files": [
            "backend/app/services/catalog_service.py",
            "backend/app/schemas/catalog.py",
            "backend/app/api/catalog_routes.py",
        ],
    },
    "membership": {
        "keywords": ["membership", "subscription", "members", "plan", "billing"],
        "requirements": {
            "domain": "membership",
            "features": ["plans", "signup", "renewal"],
        },
        "questions": [
            "What membership tiers are you offering?",
            "Do you need recurring billing automation?",
            "What access controls are required?",
        ],
        "architecture": {
            "services": ["membership-service", "billing-service"],
            "storage": "sqlite",
        },
        "tasks": [
            {"id": "mb-1", "title": "Define membership tiers", "status": "todo"},
            {"id": "mb-2", "title": "Build signup and onboarding", "status": "todo"},
            {"id": "mb-3", "title": "Plan billing lifecycle", "status": "todo"},
        ],
        "scaffold_files": [
            "backend/app/services/membership_service.py",
            "backend/app/schemas/membership.py",
            "backend/app/api/membership_routes.py",
        ],
    },
    "school_sis": {
        "keywords": ["school", "student", "sis", "grades", "attendance", "classroom"],
        "requirements": {
            "domain": "school_sis",
            "features": ["student records", "grades", "attendance"],
        },
        "questions": [
            "What grade levels or programs are included?",
            "Do you need parent or guardian access?",
            "Which reports are most important?",
        ],
        "architecture": {
            "services": ["student-service", "records-service"],
            "storage": "sqlite",
        },
        "tasks": [
            {"id": "sc-1", "title": "Define student and class models", "status": "todo"},
            {"id": "sc-2", "title": "Design attendance workflow", "status": "todo"},
            {"id": "sc-3", "title": "Plan grading and reporting", "status": "todo"},
        ],
        "scaffold_files": [
            "backend/app/services/student_service.py",
            "backend/app/schemas/student.py",
            "backend/app/api/student_routes.py",
        ],
    },
    "unknown": {
        "keywords": [],
        "requirements": {
            "domain": "unknown",
            "features": ["discovery"],
        },
        "questions": [
            "What is the primary goal of the system?",
            "Who are the main users and roles?",
            "What data must be tracked?",
        ],
        "architecture": {
            "services": ["core-service"],
            "storage": "sqlite",
        },
        "tasks": [
            {"id": "uk-1", "title": "Clarify core workflow", "status": "todo"},
            {"id": "uk-2", "title": "Identify data entities", "status": "todo"},
        ],
        "scaffold_files": [
            "backend/app/services/core_service.py",
            "backend/app/schemas/core.py",
            "backend/app/api/core_routes.py",
        ],
    },
}


def get_recipe_definition(recipe: str) -> Dict[str, Any]:
    return RECIPES.get(recipe, RECIPES["unknown"])
