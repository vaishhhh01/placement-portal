"""TIER 2 - BUSINESS LOGIC: all the rules live here (no HTML, no routes)."""
from datetime import datetime
from models import db, User, JobPosting, Application, AuditLog

STATUSES = ["APPLIED", "SHORTLISTED", "INTERVIEWED", "HIRED", "REJECTED"]
JOB_STATUSES = ["PENDING", "ACTIVE", "CLOSED", "REJECTED"]

def check_eligibility(profile, job):
    """Server-side gate: returns (True, '') or (False, 'reason')."""
    if profile.cgpa < job.min_cgpa:
        return False, f"Application blocked: Minimum CGPA required is {job.min_cgpa}, but your CGPA is {profile.cgpa}."
    if job.allowed_grad_year and profile.graduation_year != job.allowed_grad_year:
        return False, f"Application blocked: This job is for the {job.allowed_grad_year} batch, but your graduation year is {profile.graduation_year}."
    allowed = [d.strip().upper() for d in job.allowed_departments.split(",")]
    if profile.branch.upper() not in allowed:
        return False, f"Application blocked: Allowed branches are {job.allowed_departments}, but yours is {profile.branch}."
    return True, ""

def apply_to_job(user, job_id):
    job = db.session.get(JobPosting, job_id)
    if not job or job.status != "ACTIVE":
        return False, "This job is not open."
    if Application.query.filter_by(student_id=user.id, job_id=job_id).first():
        return False, "You already applied to this job."
    ok, msg = check_eligibility(user.profile, job)
    if not ok:
        return False, msg
    db.session.add(Application(student_id=user.id, job_id=job_id))
    db.session.commit()
    return True, "Application submitted!"

def create_job(recruiter, form):
    if recruiter.status != "ACTIVE":
        return False, "Your company is not approved by the admin yet."
    db.session.add(JobPosting(
        recruiter_id=recruiter.id, title=form["title"], description=form["description"],
        min_cgpa=float(form["min_cgpa"]), allowed_departments=form["departments"],
        allowed_grad_year=int(form["grad_year"]) if form.get("grad_year") else None))
    db.session.commit()
    return True, "Job submitted. It will be visible to students after admin approval."

def close_job(recruiter, job_id):
    """Close one of a company's jobs so it no longer accepts new applications."""
    job = db.session.get(JobPosting, job_id)
    if not job or job.recruiter_id != recruiter.id:
        return False, "That job could not be found."
    if job.status == "CLOSED":
        return False, "Hiring is already closed for this job."
    job.status = "CLOSED"
    db.session.commit()
    return True, "Hiring closed. The job is retained in My jobs with a CLOSED status."

def moderate(admin, kind, target_id, decision, reason=""):
    """kind = 'company' or 'job'; decision = 'approve' or 'reject'."""
    item = db.session.get(User if kind == "company" else JobPosting, target_id)
    approved = decision == "approve"
    item.status = "ACTIVE" if approved else "REJECTED"
    action = ("APPROVED_" if approved else "REJECTED_") + kind.upper()
    db.session.add(AuditLog(admin_id=admin.id, action_type=action, target_id=target_id, reason=reason))
    db.session.commit()

def update_status(recruiter, app_ids, new_status):
    """Works for one id or many (batch). Only touches this recruiter's own jobs."""
    if new_status not in STATUSES:
        return 0
    apps = Application.query.filter(Application.id.in_(app_ids)).all()
    count = 0
    for a in apps:
        if a.job.recruiter_id == recruiter.id:
            a.status = new_status
            a.updated_at = datetime.utcnow()
            count += 1
    db.session.commit()
    return count


def update_profile(user, data):
    """Students may only edit their resume link. CGPA/branch/year stay verified."""
    user.profile.resume_link = (data.get("resume_link") or "").strip()
    db.session.commit()
    return True, "Resume link saved."

def update_company_profile(user, data):
    user.company_description = (data.get("description") or "").strip()
    db.session.commit()
    return True, "Company profile saved."
