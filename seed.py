"""Run once: python seed.py  -> creates database.db with sample data."""
from werkzeug.security import generate_password_hash as h
from app import app
from models import db, User, StudentProfile, JobPosting

with app.app_context():
    db.drop_all(); db.create_all()
    db.session.add_all([
        User(email="admin@college.edu", password_hash=h("admin123"), role="admin"),
        User(email="asha@college.edu", password_hash=h("student123"), role="student"),
        User(email="ravi@college.edu", password_hash=h("student123"), role="student"),
        User(email="hr@techcorp.com", password_hash=h("company123"), role="recruiter", company_name="TechCorp", company_description="Product engineering company focused on scalable systems."),
        User(email="hr@newstartup.com", password_hash=h("company123"), role="recruiter", company_name="NewStartup", company_description="Early-stage startup currently awaiting onboarding approval.", status="PENDING"),
    ]); db.session.commit()
    u = lambda e: User.query.filter_by(email=e).first().id
    db.session.add_all([
        StudentProfile(user_id=u("asha@college.edu"), full_name="Asha K", branch="CSE", cgpa=8.2, graduation_year=2026, resume_link="http://example.com/asha"),
        StudentProfile(user_id=u("ravi@college.edu"), full_name="Ravi M", branch="ECE", cgpa=7.1, graduation_year=2026, resume_link="http://example.com/ravi"),
        JobPosting(recruiter_id=u("hr@techcorp.com"), title="Software Engineer", description="Build web apps.", min_cgpa=7.5, allowed_departments="CSE,IT", allowed_grad_year=2026, status="ACTIVE"),
        JobPosting(recruiter_id=u("hr@techcorp.com"), title="Senior Software Manager", description="Lead a team.", min_cgpa=9.0, allowed_departments="ECE,IT", allowed_grad_year=2026, status="ACTIVE"),
        JobPosting(recruiter_id=u("hr@techcorp.com"), title="Data Analyst", description="Analyse data.", min_cgpa=7.0, allowed_departments="CSE,IT,ECE", allowed_grad_year=2026, status="PENDING"),
    ]); db.session.commit()
    print("Database ready.")
