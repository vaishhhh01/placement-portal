"""TIER 1 - PRESENTATION: routes that connect pages to the logic layer."""
from functools import wraps
from flask import Flask, render_template, request, redirect, session, flash, jsonify
from werkzeug.security import check_password_hash
from models import db, User, JobPosting, Application, AuditLog
import services

app = Flask(__name__)
app.config.update(SECRET_KEY="change-me", SQLALCHEMY_DATABASE_URI="sqlite:///database.db")
db.init_app(app)

ROLE_MAP = {"student": "student", "company": "recruiter", "admin": "admin"}

# Default (demo) login for each button - these match the users created in seed.py
DEMO = {
    "student": ("asha@college.edu", "student123"),
    "company": ("hr@techcorp.com", "company123"),
    "admin": ("admin@college.edu", "admin123"),
}

def role_required(page):
    def deco(f):
        @wraps(f)
        def wrapper(*a, **k):
            user = db.session.get(User, session.get("uid")) if session.get("uid") else None
            if not user or user.role != ROLE_MAP[page]:
                flash("Please log in first.")
                return redirect(f"/login/{page}")
            return f(user, *a, **k)
        return wrapper
    return deco

@app.route("/")
def home():
    return render_template("home.html")

@app.route("/login/<page>", methods=["GET", "POST"])
def login(page):
    if page not in ROLE_MAP:
        return redirect("/")
    if request.method == "POST":
        user = User.query.filter_by(email=request.form["email"], role=ROLE_MAP[page]).first()
        if user and check_password_hash(user.password_hash, request.form["password"]):
            session["uid"] = user.id
            return redirect(f"/{page}")
        flash("Wrong email or password.")
    return render_template("login.html", page=page, demo=DEMO[page])

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

# ----- Student -----
@app.route("/student")
@role_required("student")
def student(user):
    jobs = JobPosting.query.filter_by(status="ACTIVE").all()
    apps = Application.query.filter_by(student_id=user.id).all()
    return render_template("student.html", user=user, jobs=jobs, apps=apps)

@app.route("/student/apply/<int:job_id>", methods=["POST"])
@role_required("student")
def apply(user, job_id):
    ok, msg = services.apply_to_job(user, job_id)
    flash(msg)
    return redirect("/student")

# ----- Company -----
@app.route("/company")
@role_required("company")
def company(user):
    jobs = JobPosting.query.filter_by(recruiter_id=user.id).all()
    applicants = Application.query.join(JobPosting).filter(JobPosting.recruiter_id == user.id).all()
    return render_template("company.html", user=user, jobs=jobs, applicants=applicants, statuses=services.STATUSES)

@app.route("/company/post", methods=["POST"])
@role_required("company")
def post_job(user):
    ok, msg = services.create_job(user, request.form)
    flash(msg)
    return redirect("/company")

@app.route("/company/update", methods=["POST"])
@role_required("company")
def update(user):
    n = services.update_status(user, request.form.getlist("ids", type=int), request.form["status"])
    flash(f"Updated {n} application(s).")
    return redirect("/company")

# ----- Admin -----
@app.route("/admin")
@role_required("admin")
def admin(user):
    return render_template("admin.html", user=user,
        companies=User.query.filter_by(role="recruiter", status="PENDING").all(),
        jobs=JobPosting.query.filter_by(status="PENDING").all(),
        logs=AuditLog.query.order_by(AuditLog.timestamp.desc()).all())

@app.route("/admin/moderate", methods=["POST"])
@role_required("admin")
def moderate(user):
    services.moderate(user, request.form["kind"], int(request.form["id"]), request.form["decision"])
    flash("Decision saved and logged.")
    return redirect("/admin")

# ================= JSON API (used by the fetch() calls in static/*.js) =================
def api_role(page):
    def deco(f):
        @wraps(f)
        def wrapper(*a, **k):
            user = db.session.get(User, session.get("uid")) if session.get("uid") else None
            if not user or user.role != ROLE_MAP[page]:
                return jsonify(ok=False, message="Please log in."), 401
            return f(user, *a, **k)
        return wrapper
    return deco

def when(dt):
    return dt.strftime("%d %b %Y, %H:%M") if dt else ""

def job_json(j):
    return dict(id=j.id, title=j.title, company=j.recruiter.company_name, min_cgpa=j.min_cgpa,
                grad_year=j.allowed_grad_year, branches=j.allowed_departments, status=j.status)

@app.route("/api/login", methods=["POST"])
def api_login():
    d = request.get_json() or {}
    page = d.get("page")
    user = User.query.filter_by(email=d.get("email"), role=ROLE_MAP.get(page, "")).first()
    if user and check_password_hash(user.password_hash, d.get("password", "")):
        session["uid"] = user.id
        return jsonify(ok=True, redirect=f"/{page}")
    return jsonify(ok=False, message="Wrong email or password."), 401

@app.route("/api/student/me")
@api_role("student")
def api_student_me(user):
    p = user.profile
    return jsonify(name=p.full_name, branch=p.branch, cgpa=p.cgpa, graduation_year=p.graduation_year, resume_link=p.resume_link)

@app.route("/api/student/profile", methods=["POST"])
@api_role("student")
def api_student_profile(user):
    ok, msg = services.update_profile(user, request.get_json() or {})
    return jsonify(ok=ok, message=msg)

@app.route("/api/jobs")
@api_role("student")
def api_jobs(user):
    return jsonify([job_json(j) for j in JobPosting.query.filter_by(status="ACTIVE")])

@app.route("/api/student/applications")
@api_role("student")
def api_student_apps(user):
    return jsonify([dict(job=a.job.title, status=a.status, changed=when(a.updated_at or a.applied_at))
                    for a in Application.query.filter_by(student_id=user.id)])

@app.route("/api/student/apply/<int:job_id>", methods=["POST"])
@api_role("student")
def api_apply(user, job_id):
    ok, msg = services.apply_to_job(user, job_id)
    return jsonify(ok=ok, message=msg)

@app.route("/api/company/me")
@api_role("company")
def api_company_me(user):
    return jsonify(company_name=user.company_name, description=user.company_description or "", status=user.status)

@app.route("/api/company/profile", methods=["POST"])
@api_role("company")
def api_company_profile(user):
    ok, msg = services.update_company_profile(user, request.get_json() or {})
    return jsonify(ok=ok, message=msg)

@app.route("/api/company/jobs", methods=["GET", "POST"])
@api_role("company")
def api_company_jobs(user):
    if request.method == "POST":
        try:
            ok, msg = services.create_job(user, request.get_json() or {})
        except (KeyError, ValueError):
            ok, msg = False, "Please fill title, min CGPA (a number) and branches."
        return jsonify(ok=ok, message=msg)
    return jsonify([job_json(j) for j in JobPosting.query.filter_by(recruiter_id=user.id)])

@app.route("/api/company/jobs/<int:job_id>/close", methods=["POST"])
@api_role("company")
def api_close_company_job(user, job_id):
    ok, msg = services.close_job(user, job_id)
    return jsonify(ok=ok, message=msg)

@app.route("/api/company/applicants")
@api_role("company")
def api_company_applicants(user):
    rows = Application.query.join(JobPosting).filter(JobPosting.recruiter_id == user.id).all()
    return jsonify([dict(id=a.id, student=a.student.profile.full_name, job=a.job.title, cgpa=a.student.profile.cgpa,
                         status=a.status, changed=when(a.updated_at or a.applied_at)) for a in rows])

@app.route("/api/company/update", methods=["POST"])
@api_role("company")
def api_company_update(user):
    d = request.get_json() or {}
    n = services.update_status(user, d.get("ids", []), d.get("status"))
    return jsonify(ok=n > 0, message=f"Updated {n} application(s).")

@app.route("/api/admin/pending")
@api_role("admin")
def api_admin_pending(user):
    return jsonify(
        companies=[dict(id=c.id, name=c.company_name, description=c.company_description or "")
                   for c in User.query.filter_by(role="recruiter", status="PENDING")],
        jobs=[job_json(j) for j in JobPosting.query.filter_by(status="PENDING")])

@app.route("/api/admin/directory")
@api_role("admin")
def api_admin_directory(user):
    companies = []
    for company in User.query.filter_by(role="recruiter").all():
        jobs = JobPosting.query.filter_by(recruiter_id=company.id).all()
        if any(job.status in ("ACTIVE", "PENDING") for job in jobs):
            hiring_status = "OPEN"
        elif any(job.status == "CLOSED" for job in jobs):
            hiring_status = "CLOSED"
        else:
            hiring_status = "NOT STARTED"
        companies.append(dict(name=company.company_name or "Unnamed company", email=company.email,
                              status=company.status, hiring_status=hiring_status))
    students = [dict(name=(student.profile.full_name if student.profile else "Unnamed student"),
                     email=student.email, branch=(student.profile.branch if student.profile else "—"),
                     status=student.status)
                for student in User.query.filter_by(role="student").all()]
    return jsonify(companies=companies, students=students)

@app.route("/api/admin/moderate", methods=["POST"])
@api_role("admin")
def api_admin_moderate(user):
    d = request.get_json() or {}
    services.moderate(user, d["kind"], int(d["id"]), d["decision"], d.get("reason", ""))
    return jsonify(ok=True, message="Decision saved and logged.")

@app.route("/api/admin/logs")
@api_role("admin")
def api_admin_logs(user):
    return jsonify([dict(when=when(l.timestamp), admin_id=l.admin_id, action=l.action_type, target=l.target_id, reason=l.reason or "")
                    for l in AuditLog.query.order_by(AuditLog.timestamp.desc())])

if __name__ == "__main__":
    app.run(debug=True)
