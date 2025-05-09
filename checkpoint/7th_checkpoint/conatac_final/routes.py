from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models import ContactUs
import requests

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ContactRequest(BaseModel):
    name: str
    email: str
    message: str

@router.post("/contact")
async def create_contact(data: ContactRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host

    # ✅ 로컬 테스트 시에는 테스트용 공용 IP로 치환
    if ip == "127.0.0.1":
        ip = "8.8.8.8"  # Google DNS → United States

    try:
        res = requests.get(f"https://ipapi.co/{ip}/json")
        country = res.json().get("country_name", "Unknown")
    except:
        country = "Unknown"

    contact = ContactUs(
        name=data.name,
        email=data.email,
        message=data.message,
        ip=ip,
        country=country
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return {"message": "Contact saved successfully."}

@router.get("/admin/contact_list")
async def get_contact_list(db: Session = Depends(get_db)):
    contacts = db.query(ContactUs).order_by(ContactUs.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "message": c.message,
            "ip": c.ip,
            "country": c.country,
            "created_at": c.created_at
        }
        for c in contacts
    ]
