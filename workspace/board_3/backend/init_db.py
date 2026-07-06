from datetime import datetime

from app.db import SessionLocal, init_db
from app import models


def seed_demo(db):
    tenant = db.query(models.Tenant).filter(models.Tenant.handle == "demo-salon").first()
    if not tenant:
        now = datetime.now(timezone.utc)
        tenant = models.Tenant(
            display_name="Demo Salon",
            handle="demo-salon",
            recipe="salon",
            created_at=now,
            updated_at=now,
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    customer = db.query(models.Customer).filter(models.Customer.tenant_id == tenant.id).first()
    if not customer:
        customer = models.Customer(
            tenant_id=tenant.id,
            name="Jordan",
            phone="555-0100",
            email="jordan@example.com",
        )
        db.add(customer)
    service = (
        db.query(models.Service)
        .filter(models.Service.tenant_id == tenant.id)
        .first()
    )
    if not service:
        service = models.Service(tenant_id=tenant.id, name="Basic Cut", duration_minutes=30)
        db.add(service)
    staff = db.query(models.Staff).filter(models.Staff.tenant_id == tenant.id).first()
    if not staff:
        staff = models.Staff(tenant_id=tenant.id, name="Alex", role="Stylist")
        db.add(staff)
    db.commit()
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.tenant_id == tenant.id)
        .first()
    )
    if not appointment:
        appointment = models.Appointment(
            tenant_id=tenant.id,
            customer_name="Jordan",
            start_time="2026-01-10T10:00:00",
            end_time="2026-01-10T10:30:00",
            service_id=service.id,
            staff_id=staff.id,
            customer_id=customer.id,
        )
        db.add(appointment)
        db.commit()


if __name__ == "__main__":
    init_db()
    session = SessionLocal()
    try:
        seed_demo(session)
    finally:
        session.close()
    print("Database initialized")
