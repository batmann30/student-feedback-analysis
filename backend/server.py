from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict

# -------------------- Mongo --------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# -------------------- App --------------------
app = FastAPI(title="East West College Feedback API")
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_EXP_HOURS = 8

security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ewc")


# -------------------- Auth helpers --------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return payload


# -------------------- Models --------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: EmailStr


class SubjectRating(BaseModel):
    subject: str
    teaching: int = Field(ge=1, le=5)
    clarity: int = Field(ge=1, le=5)
    materials: int = Field(ge=1, le=5)


class GeneralRatings(BaseModel):
    campus: int = Field(ge=1, le=5)
    staff: int = Field(ge=1, le=5)
    management: int = Field(ge=1, le=5)
    facilities: int = Field(ge=1, le=5)
    placements: int = Field(ge=1, le=5)


class FeedbackIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course: str
    year: str
    semester: str
    academic_year: Optional[str] = None
    roll_no: Optional[str] = None
    student_name: Optional[str] = None
    comments: Optional[str] = None
    subject_ratings: List[SubjectRating]
    general_ratings: GeneralRatings

    @field_validator("subject_ratings")
    @classmethod
    def at_least_one(cls, v):
        if not v:
            raise ValueError("At least one subject rating is required")
        return v


# -------------------- Seed data --------------------
DEFAULT_ACADEMIC_YEAR = "2025-2026"

SEED_SUBJECTS = {
    "BCA": {
        "Year 1": {
            "Semester 1": ["C Programming", "Mathematics-I", "English Communication", "Digital Electronics"],
            "Semester 2": ["Data Structures", "Mathematics-II", "Soft Skills", "Operating Systems Basics"],
        },
        "Year 2": {
            "Semester 3": ["DBMS", "Object Oriented Programming (Java)", "Web Technology", "Discrete Mathematics"],
            "Semester 4": ["Computer Networks", "Software Engineering", "Python Programming", "Statistics"],
        },
        "Year 3": {
            "Semester 5": ["Artificial Intelligence", "Mobile App Development", "Cloud Computing", "Project Management"],
            "Semester 6": ["Machine Learning", "Cybersecurity", "Internship", "Final Year Project"],
        },
    },
    "BBA": {
        "Year 1": {
            "Semester 1": ["Principles of Management", "Business Economics", "Financial Accounting", "Business Communication"],
            "Semester 2": ["Organisational Behaviour", "Marketing Management", "Business Law", "Quantitative Techniques"],
        },
        "Year 2": {
            "Semester 3": ["Human Resource Management", "Cost Accounting", "Operations Research", "Corporate Finance"],
            "Semester 4": ["Strategic Management", "Entrepreneurship", "Business Analytics", "Taxation"],
        },
        "Year 3": {
            "Semester 5": ["International Business", "Digital Marketing", "Supply Chain Management", "Project Work"],
            "Semester 6": ["Leadership & Ethics", "Brand Management", "Consumer Behaviour", "Internship"],
        },
    },
    "B.Com": {
        "Year 1": {
            "Semester 1": ["Financial Accounting", "Business Economics", "Business Law", "English"],
            "Semester 2": ["Corporate Accounting", "Banking & Insurance", "Business Statistics", "Environmental Studies"],
        },
        "Year 2": {
            "Semester 3": ["Cost Accounting", "Company Law", "Income Tax", "Marketing Management"],
            "Semester 4": ["Management Accounting", "Auditing", "Indirect Taxes", "E-Commerce"],
        },
        "Year 3": {
            "Semester 5": ["Financial Management", "International Trade", "Investment Analysis", "Research Methods"],
            "Semester 6": ["Strategic Management", "GST & Customs", "Entrepreneurship", "Project Report"],
        },
    },
    "MCA": {
        "Year 1": {
            "Semester 1": ["Advanced Data Structures", "Computer Architecture", "Discrete Mathematics", "Operating Systems"],
            "Semester 2": ["Advanced DBMS", "Software Engineering", "Computer Networks", "Java Programming"],
        },
        "Year 2": {
            "Semester 3": ["Machine Learning", "Cloud Computing", "Data Mining", "Mini Project"],
            "Semester 4": ["Deep Learning", "Information Security", "Big Data Analytics", "Major Project"],
        },
    },
}


async def seed_admin():
    email = os.environ["ADMIN_EMAIL"]
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.admin_users.find_one({"email": email}, {"_id": 0})
    if not existing:
        await db.admin_users.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {email}")
    else:
        # Keep hash in sync if env password changed
        if not verify_password(password, existing["password_hash"]):
            await db.admin_users.update_one(
                {"email": email},
                {"$set": {"password_hash": hash_password(password)}},
            )
            logger.info("Admin password refreshed from .env")


async def seed_subjects():
    count = await db.subject_config.count_documents({})
    if count > 0:
        return
    docs = []
    for course, years in SEED_SUBJECTS.items():
        for year, sems in years.items():
            for sem, subjects in sems.items():
                docs.append({
                    "id": str(uuid.uuid4()),
                    "course": course,
                    "year": year,
                    "semester": sem,
                    "academic_year": DEFAULT_ACADEMIC_YEAR,
                    "subjects": subjects,
                })
    if docs:
        await db.subject_config.insert_many(docs)
        logger.info(f"Seeded {len(docs)} subject_config docs")


@app.on_event("startup")
async def on_startup():
    await db.feedback.create_index("roll_no")
    await db.subject_config.create_index([("course", 1), ("year", 1), ("semester", 1)])
    await seed_admin()
    await seed_subjects()


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# -------------------- Public routes --------------------
@api.get("/")
async def root():
    return {"app": "East West College Feedback", "status": "ok"}


@api.get("/courses")
async def list_courses():
    """Return nested tree: course -> year -> semesters[]"""
    configs = await db.subject_config.find({}, {"_id": 0}).to_list(2000)
    tree: Dict[str, Dict[str, List[str]]] = {}
    for c in configs:
        tree.setdefault(c["course"], {}).setdefault(c["year"], [])
        if c["semester"] not in tree[c["course"]][c["year"]]:
            tree[c["course"]][c["year"]].append(c["semester"])
    # Sort semesters for stable ordering
    for course in tree:
        for yr in tree[course]:
            tree[course][yr].sort()
    return {"courses": tree}


@api.get("/subjects")
async def get_subjects(course: str, year: str, semester: str):
    doc = await db.subject_config.find_one(
        {"course": course, "year": year, "semester": semester},
        {"_id": 0},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No subjects configured for this selection")
    return doc


@api.post("/feedback")
async def submit_feedback(payload: FeedbackIn):
    # Dedupe by roll_no + course + semester + academic_year when roll_no provided
    if payload.roll_no:
        existing = await db.feedback.find_one({
            "roll_no": payload.roll_no,
            "course": payload.course,
            "semester": payload.semester,
            "academic_year": payload.academic_year or DEFAULT_ACADEMIC_YEAR,
        })
        if existing:
            raise HTTPException(status_code=409, detail="Feedback already submitted for this roll number")

    # Validate subjects are in config
    cfg = await db.subject_config.find_one(
        {"course": payload.course, "year": payload.year, "semester": payload.semester},
        {"_id": 0},
    )
    if not cfg:
        raise HTTPException(status_code=400, detail="Invalid course/year/semester")
    allowed = set(cfg["subjects"])
    for sr in payload.subject_ratings:
        if sr.subject not in allowed:
            raise HTTPException(status_code=400, detail=f"Subject '{sr.subject}' not in configured subjects")

    doc = {
        "id": str(uuid.uuid4()),
        "course": payload.course,
        "year": payload.year,
        "semester": payload.semester,
        "academic_year": payload.academic_year or DEFAULT_ACADEMIC_YEAR,
        "roll_no": payload.roll_no,
        "student_name": payload.student_name,
        "comments": payload.comments,
        "subject_ratings": [sr.model_dump() for sr in payload.subject_ratings],
        "general_ratings": payload.general_ratings.model_dump(),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.feedback.insert_one(doc)
    doc.pop("_id", None)
    return {"success": True, "id": doc["id"]}


# -------------------- Admin routes --------------------
@api.post("/admin/login", response_model=LoginOut)
async def admin_login(payload: LoginIn):
    user = await db.admin_users.find_one({"email": payload.email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(payload.email)
    return LoginOut(access_token=token, email=payload.email)


@api.get("/admin/me")
async def admin_me(user=Depends(require_admin)):
    return {"email": user["sub"], "role": user["role"]}


def _avg(nums: List[float]) -> float:
    return round(sum(nums) / len(nums), 2) if nums else 0.0


@api.get("/admin/analytics")
async def admin_analytics(
    course: Optional[str] = None,
    semester: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    _user=Depends(require_admin),
):
    q: Dict[str, Any] = {}
    if course:
        q["course"] = course
    if semester:
        q["semester"] = semester
    if date_from or date_to:
        rng: Dict[str, str] = {}
        if date_from:
            rng["$gte"] = date_from
        if date_to:
            rng["$lte"] = date_to + "T23:59:59"
        q["submitted_at"] = rng

    rows = await db.feedback.find(q, {"_id": 0}).to_list(10000)
    total = len(rows)

    # Course distribution
    course_dist: Dict[str, int] = {}
    for r in rows:
        course_dist[r["course"]] = course_dist.get(r["course"], 0) + 1

    # General rating averages
    gen_keys = ["campus", "staff", "management", "facilities", "placements"]
    gen_avgs = {k: _avg([r["general_ratings"][k] for r in rows]) for k in gen_keys}

    # Subject-wise averages
    subj_map: Dict[str, Dict[str, List[int]]] = {}
    for r in rows:
        for sr in r.get("subject_ratings", []):
            key = f"{r['course']} · {sr['subject']}"
            d = subj_map.setdefault(key, {"teaching": [], "clarity": [], "materials": []})
            d["teaching"].append(sr["teaching"])
            d["clarity"].append(sr["clarity"])
            d["materials"].append(sr["materials"])
    subject_averages = [
        {
            "subject": k,
            "teaching": _avg(v["teaching"]),
            "clarity": _avg(v["clarity"]),
            "materials": _avg(v["materials"]),
            "responses": len(v["teaching"]),
        }
        for k, v in subj_map.items()
    ]
    subject_averages.sort(key=lambda x: -x["responses"])

    # Trend: count per day (last 30 days of data)
    day_counts: Dict[str, int] = {}
    for r in rows:
        day = (r.get("submitted_at") or "")[:10]
        if day:
            day_counts[day] = day_counts.get(day, 0) + 1
    trend = [{"date": d, "count": c} for d, c in sorted(day_counts.items())]

    # Overall avg
    all_scores: List[int] = []
    for r in rows:
        for k in gen_keys:
            all_scores.append(r["general_ratings"][k])
        for sr in r.get("subject_ratings", []):
            all_scores.extend([sr["teaching"], sr["clarity"], sr["materials"]])

    return {
        "total": total,
        "overall_average": _avg(all_scores),
        "course_distribution": [{"course": k, "count": v} for k, v in course_dist.items()],
        "general_averages": gen_avgs,
        "subject_averages": subject_averages,
        "trend": trend,
    }


@api.get("/admin/feedback")
async def list_feedback(
    course: Optional[str] = None,
    semester: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    _user=Depends(require_admin),
):
    q: Dict[str, Any] = {}
    if course:
        q["course"] = course
    if semester:
        q["semester"] = semester
    rows = await db.feedback.find(q, {"_id": 0}).sort("submitted_at", -1).to_list(limit)
    return {"items": rows, "count": len(rows)}


@api.get("/admin/export")
async def export_csv(
    course: Optional[str] = None,
    semester: Optional[str] = None,
    _user=Depends(require_admin),
):
    q: Dict[str, Any] = {}
    if course:
        q["course"] = course
    if semester:
        q["semester"] = semester
    rows = await db.feedback.find(q, {"_id": 0}).to_list(10000)

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "id", "submitted_at", "course", "year", "semester", "academic_year",
        "roll_no", "student_name",
        "campus", "staff", "management", "facilities", "placements",
        "subject", "teaching", "clarity", "materials",
        "comments",
    ])
    for r in rows:
        g = r.get("general_ratings", {})
        srs = r.get("subject_ratings") or [{}]
        for sr in srs:
            writer.writerow([
                r.get("id"), r.get("submitted_at"), r.get("course"), r.get("year"),
                r.get("semester"), r.get("academic_year"),
                r.get("roll_no") or "", r.get("student_name") or "",
                g.get("campus", ""), g.get("staff", ""), g.get("management", ""),
                g.get("facilities", ""), g.get("placements", ""),
                sr.get("subject", ""), sr.get("teaching", ""),
                sr.get("clarity", ""), sr.get("materials", ""),
                (r.get("comments") or "").replace("\n", " "),
            ])
    buf.seek(0)
    filename = f"feedback_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# -------------------- Wire up --------------------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
