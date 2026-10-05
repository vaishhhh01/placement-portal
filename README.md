# Placement Portal (beginner 3-tier Flask app)

## Run it
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

## 3 tiers
- Tier 1 Presentation: `app.py` + `templates/` + `static/`
- Tier 2 Logic: `services.py`
- Tier 3 Data: `models.py` + `instance/database.db`

## Upgrading the frontend later
1. Make it prettier: add Bootstrap via CDN `<link>` in `templates/base.html`; no Python changes needed.
2. Make it a React/Vue app: add JSON routes (`return jsonify(...)`) that call the same `services.py` functions; the frontend fetches them. Logic and database stay untouched.
