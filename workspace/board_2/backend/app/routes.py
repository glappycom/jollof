from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app import models, schemas

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/appointments", response_model=List[schemas.AppointmentOut])
def list_appointments(db: Session = Depends(get_db)):
    return db.query(models.Appointment).all()


@router.post("/appointments", response_model=schemas.AppointmentOut)
def create_appointment(payload: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    appointment = models.Appointment(**payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.get(models.Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router.put("/appointments/{appointment_id}", response_model=schemas.AppointmentOut)
def update_appointment(
    appointment_id: int, payload: schemas.AppointmentUpdate, db: Session = Depends(get_db)
):
    appointment = db.get(models.Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(appointment, key, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.get(models.Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()
    return {"deleted": True}


@router.get("/services", response_model=List[schemas.ServiceOut])
def list_services(db: Session = Depends(get_db)):
    return db.query(models.Service).all()


@router.post("/services", response_model=schemas.ServiceOut)
def create_service(payload: schemas.ServiceCreate, db: Session = Depends(get_db)):
    service = models.Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/services/{service_id}", response_model=schemas.ServiceOut)
def get_service(service_id: int, db: Session = Depends(get_db)):
    service = db.get(models.Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@router.put("/services/{service_id}", response_model=schemas.ServiceOut)
def update_service(service_id: int, payload: schemas.ServiceUpdate, db: Session = Depends(get_db)):
    service = db.get(models.Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, key, value)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)):
    service = db.get(models.Service, service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    db.delete(service)
    db.commit()
    return {"deleted": True}


@router.get("/staff", response_model=List[schemas.StaffOut])
def list_staff(db: Session = Depends(get_db)):
    return db.query(models.Staff).all()


@router.post("/staff", response_model=schemas.StaffOut)
def create_staff(payload: schemas.StaffCreate, db: Session = Depends(get_db)):
    staff = models.Staff(**payload.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/staff/{staff_id}", response_model=schemas.StaffOut)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.get(models.Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    return staff


@router.put("/staff/{staff_id}", response_model=schemas.StaffOut)
def update_staff(staff_id: int, payload: schemas.StaffUpdate, db: Session = Depends(get_db)):
    staff = db.get(models.Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(staff, key, value)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    staff = db.get(models.Staff, staff_id)
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    db.delete(staff)
    db.commit()
    return {"deleted": True}
