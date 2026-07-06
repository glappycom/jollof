from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TenantCreate(BaseModel):
    display_name: str
    handle: str
    recipe: str = "salon"


class TenantOut(BaseModel):
    id: int
    display_name: str
    handle: str
    recipe: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CustomerOut(CustomerCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int = 30


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None


class ServiceOut(ServiceCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class StaffCreate(BaseModel):
    name: str
    role: Optional[str] = None


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None


class StaffOut(StaffCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class AppointmentCreate(BaseModel):
    customer_name: str
    start_time: str
    end_time: str
    service_id: Optional[int] = None
    staff_id: Optional[int] = None
    customer_id: Optional[int] = None


class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    service_id: Optional[int] = None
    staff_id: Optional[int] = None
    customer_id: Optional[int] = None


class AppointmentOut(AppointmentCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)
