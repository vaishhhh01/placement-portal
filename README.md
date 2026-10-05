# Alley (Campus Placement & Internship Portal)

## How to run it?
    pip install -r requirements.txt
    python seed.py      # creates instance/database.db with sample data
    python app.py       # open http://127.0.0.1:5000

## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@college.edu | admin123 |
| Student (CGPA 8.2, CSE) | asha@college.edu | student123 |
| Student (CGPA 7.1, ECE – gets blocked) | ravi@college.edu | student123 |
| Company (approved) | hr@techcorp.com | company123 |
| Company (pending) | hr@newstartup.com | company123 |

## Three-Tier Multi-Page System
- Tier 1 Presentation: `app.py` + `templates/` + `static/`
- Tier 2 Logic: `services.py`
- Tier 3 Data: `models.py` + `instance/database.db`

