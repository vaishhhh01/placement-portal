"""TIER 3 - DATA LAYER: defines the database tables (SQLite)."""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)          # student / recruiter / admin
    company_description = db.Column(db.Text, default="")
    company_name = db.Column(db.String)                  # only for recruiters
    status = db.Column(db.String, default="ACTIVE")      # recruiters start as PENDING
    profile = db.relationship("StudentProfile", uselist=False)

class StudentProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    full_name = db.Column(db.String)
    branch = db.Column(db.String)
    cgpa = db.Column(db.Float)
    graduation_year = db.Column(db.Integer)
    resume_link = db.Column(db.String)

class JobPosting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recruiter_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    title = db.Column(db.String)
    description = db.Column(db.Text)
    min_cgpa = db.Column(db.Float)
    allowed_grad_year = db.Column(db.Integer)
    allowed_departments = db.Column(db.String)           # e.g. "CSE,IT"
    status = db.Column(db.String, default="PENDING")     # PENDING / ACTIVE / CLOSED / REJECTED
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    recruiter = db.relationship("User")

class Application(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    job_id = db.Column(db.Integer, db.ForeignKey("job_posting.id"))
    status = db.Column(db.String, default="APPLIED")     # APPLIED / SHORTLISTED / INTERVIEWED / HIRED / REJECTED
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    student = db.relationship("User")
    job = db.relationship("JobPosting")

class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    action_type = db.Column(db.String)                   # e.g. APPROVED_JOB
    target_id = db.Column(db.Integer)
    reason = db.Column(db.String, default="")
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
