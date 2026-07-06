from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models, schemas

router = APIRouter()
tenant_router = APIRouter(prefix="/b/{handle}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def resolve_tenant(handle: str, db: Session = Depends(get_db)) -> models.Tenant:
    tenant = db.query(models.Tenant).filter(models.Tenant.handle == handle).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Business not found")
    return tenant


@router.post("/api/tenants", response_model=schemas.TenantOut)
def create_tenant(payload: schemas.TenantCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Tenant).filter(models.Tenant.handle == payload.handle).first()
    if existing:
        raise HTTPException(status_code=409, detail="Handle already exists")
    now = datetime.now(timezone.utc)
    tenant = models.Tenant(
        display_name=payload.display_name,
        handle=payload.handle,
        recipe=payload.recipe,
        created_at=now,
        updated_at=now,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.get("/api/tenants/{handle}", response_model=schemas.TenantOut)
def get_tenant(handle: str, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.handle == handle).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@tenant_router.get("/admin/meta", response_model=schemas.TenantOut)
def admin_meta(
    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    return tenant


@tenant_router.get("/customers", response_model=List[schemas.CustomerOut])
def list_customers(
    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    return db.query(models.Customer).filter(models.Customer.tenant_id == tenant.id).all()


@tenant_router.post("/customers", response_model=schemas.CustomerOut)
def create_customer(
    handle: str,
    payload: schemas.CustomerCreate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    customer = models.Customer(tenant_id=tenant.id, **payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@tenant_router.get("/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(
    handle: str, customer_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@tenant_router.put("/customers/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    handle: str,
    customer_id: int,
    payload: schemas.CustomerUpdate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@tenant_router.delete("/customers/{customer_id}")
def delete_customer(
    handle: str, customer_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    customer = (
        db.query(models.Customer)
        .filter(models.Customer.id == customer_id, models.Customer.tenant_id == tenant.id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"deleted": True}


@tenant_router.get("/appointments", response_model=List[schemas.AppointmentOut])
def list_appointments(
    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    return db.query(models.Appointment).filter(models.Appointment.tenant_id == tenant.id).all()


@tenant_router.post("/appointments", response_model=schemas.AppointmentOut)
def create_appointment(
    handle: str,
    payload: schemas.AppointmentCreate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    if payload.service_id:
        service = (
            db.query(models.Service)
            .filter(models.Service.id == payload.service_id, models.Service.tenant_id == tenant.id)
            .first()
        )
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    if payload.staff_id:
        staff = (
            db.query(models.Staff)
            .filter(models.Staff.id == payload.staff_id, models.Staff.tenant_id == tenant.id)
            .first()
        )
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
    if payload.customer_id:
        customer = (
            db.query(models.Customer)
            .filter(models.Customer.id == payload.customer_id, models.Customer.tenant_id == tenant.id)
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    appointment = models.Appointment(tenant_id=tenant.id, **payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@tenant_router.get("/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def get_appointment(
    handle: str, appointment_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@tenant_router.put("/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def update_appointment(
    handle: str,
    appointment_id: int,
    payload: schemas.AppointmentUpdate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    updates = payload.model_dump(exclude_unset=True)
    if "service_id" in updates and updates["service_id"] is not None:
        service = (
            db.query(models.Service)
            .filter(models.Service.id == updates["service_id"], models.Service.tenant_id == tenant.id)
            .first()
        )
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")
    if "staff_id" in updates and updates["staff_id"] is not None:
        staff = (
            db.query(models.Staff)
            .filter(models.Staff.id == updates["staff_id"], models.Staff.tenant_id == tenant.id)
            .first()
        )
        if not staff:
            raise HTTPException(status_code=404, detail="Staff not found")
    if "customer_id" in updates and updates["customer_id"] is not None:
        customer = (
            db.query(models.Customer)
            .filter(models.Customer.id == updates["customer_id"], models.Customer.tenant_id == tenant.id)
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in updates.items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@tenant_router.delete("/appointments/{appointment_id}")
def delete_appointment(
    handle: str, appointment_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    appointment = (
        db.query(models.Appointment)
        .filter(models.Appointment.id == appointment_id, models.Appointment.tenant_id == tenant.id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()
    return {"deleted": True}


@tenant_router.get("/services", response_model=List[schemas.ServiceOut])
def list_services(
    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    return db.query(models.Service).filter(models.Service.tenant_id == tenant.id).all()


@tenant_router.post("/services", response_model=schemas.ServiceOut)
def create_service(
    handle: str,
    payload: schemas.ServiceCreate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    service = models.Service(tenant_id=tenant.id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@tenant_router.get("/services/{service_id}", response_model=schemas.ServiceOut)
def get_service(
    handle: str, service_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    service = (
        db.query(models.Service)
        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@tenant_router.put("/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(
    handle: str,
    service_id: int,
    payload: schemas.ServiceUpdate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    service = (
        db.query(models.Service)
        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


@tenant_router.delete("/services/{service_id}")
def delete_service(
    handle: str, service_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    service = (
        db.query(models.Service)
        .filter(models.Service.id == service_id, models.Service.tenant_id == tenant.id)
        .first()
    )
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"deleted": True}


@tenant_router.get("/staff", response_model=List[schemas.StaffOut])
def list_staff(
    handle: str, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    return db.query(models.Staff).filter(models.Staff.tenant_id == tenant.id).all()


@tenant_router.post("/staff", response_model=schemas.StaffOut)
def create_staff(
    handle: str,
    payload: schemas.StaffCreate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    staff = models.Staff(tenant_id=tenant.id, **payload.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@tenant_router.get("/staff/{staff_id}", response_model=schemas.StaffOut)
def get_staff(
    handle: str, staff_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    staff = (
        db.query(models.Staff)
        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)
        .first()
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


@tenant_router.put("/staff/{staff_id}", response_model=schemas.StaffOut)
def update_staff(
    handle: str,
    staff_id: int,
    payload: schemas.StaffUpdate,
    tenant: models.Tenant = Depends(resolve_tenant),
    db: Session = Depends(get_db),
):
    staff = (
        db.query(models.Staff)
        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)
        .first()
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)
    db.commit()
    db.refresh(staff)
    return staff


@tenant_router.delete("/staff/{staff_id}")
def delete_staff(
    handle: str, staff_id: int, tenant: models.Tenant = Depends(resolve_tenant), db: Session = Depends(get_db)
):
    staff = (
        db.query(models.Staff)
        .filter(models.Staff.id == staff_id, models.Staff.tenant_id == tenant.id)
        .first()
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(staff)
    db.commit()
    return {"deleted": True}


router.include_router(tenant_router)
