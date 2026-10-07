# Alley (Campus Placement & Internship Portal)

## Running Locally
    pip install -r requirements.txt
    python seed.py #sample database population
    python app.py
  
https://placement-portal0.vercel.app/ - website link
## Demo logins
| Role | Email | Password |
|---|---|---|
| Admin | admin@college.edu | admin123 |
| Student (CGPA 8.2, CSE) | asha@college.edu | student123 |
| Student (CGPA 7.1, ECE – gets blocked) | ravi@college.edu | student123 |
| Company (approved) | hr@techcorp.com | company123 |
| Company (pending) | hr@newstartup.com | company123 |

## Stack
Python + Stack
SQLite Database
SQLAlchemy
CSS + JavaScript
Tools: Framer

## Deploying

Vercel used for Deployment. Deployed database used is PostgreSQL


## Three-Tier Multi-Page System
- Tier 1 Presentation: `app.py` + `templates/` + `static/`
- Tier 2 Logic: `services.py`
- Tier 3 Data: `models.py` + `instance/database.db`

