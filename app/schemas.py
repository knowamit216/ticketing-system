from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class ContactForm(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    subject: Optional[str] = Field(default="", max_length=150)
    message: str = Field(..., min_length=5, max_length=2000)

class ContactResponse(BaseModel):
    success: bool
    message: str

