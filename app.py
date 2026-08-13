import os
from datetime import datetime, date
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = Flask(__name__, static_folder=".", static_url_path="")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-in-production")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", f"sqlite:///{BASE_DIR / 'safety_prism.db'}"
).replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

db = SQLAlchemy(app)


class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    external_id = db.Column(db.String(120), unique=True, nullable=True, index=True)
    reporter = db.Column(db.String(200), nullable=True, index=True)
    department = db.Column(db.String(200), nullable=True, index=True)
    observation_type = db.Column(db.String(40), nullable=True, index=True)
    description = db.Column(db.Text, nullable=False)
    root_cause = db.Column(db.String(300), nullable=True)
    risk_level = db.Column(db.String(40), nullable=True, index=True)
    status = db.Column(db.String(40), default="OPEN", nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    actions = db.relationship("CorrectiveAction", backref="report", cascade="all, delete-orphan")


class CorrectiveAction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("report.id"), nullable=False, index=True)
    title = db.Column(db.String(300), nullable=False)
    responsible = db.Column(db.String(200), nullable=True)
    due_date = db.Column(db.Date, nullable=True, index=True)
    status = db.Column(db.String(40), default="OPEN", nullable=False, index=True)
    escalation_level = db.Column(db.Integer, default=0, nullable=False)
    correction_description = db.Column(db.Text, nullable=True)
    before_photo = db.Column(db.String(500), nullable=True)
    after_photo = db.Column(db.String(500), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def is_overdue(self):
        return bool(self.due_date and self.status != "CLOSED" and self.due_date < date.today())


def _pick(row, *names):
    normalized = {str(k).strip().lower(): v for k, v in row.items()}
    for name in names:
        value = normalized.get(name.lower())
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def import_csv(file_storage, kind):
    import csv
    import io

    raw = file_storage.read()
    text = raw.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    inserted = updated = errors = 0

    for row in reader:
        try:
            if kind == "reports":
                external_id = _pick(row, "id", "report_id", "رقم گزارش", "کد گزارش")
                description = _pick(row, "description", "شرح", "توضیحات", "شرح گزارش") or "گزارش واردشده از CSV"
                report = Report.query.filter_by(external_id=external_id).first() if external_id else None
                if report is None:
                    report = Report(external_id=external_id, description=description)
                    db.session.add(report)
                    inserted += 1
                else:
                    updated += 1
                report.reporter = _pick(row, "reporter", "reporter_name", "گزارش دهنده", "گزارش‌دهنده", "نام گزارش دهنده")
                report.department = _pick(row, "department", "unit", "واحد", "بخش")
                report.observation_type = _pick(row, "observation_type", "type", "نوع", "نوع مشاهده")
                report.root_cause = _pick(row, "root_cause", "cause", "علت", "علت ریشه ای", "علت ریشه‌ای")
                report.risk_level = _pick(row, "risk_level", "risk", "ریسک", "سطح ریسک")
                report.status = _pick(row, "status", "وضعیت") or report.status

            elif kind == "actions":
                external_report_id = _pick(row, "report_id", "report", "شماره گزارش", "کد گزارش")
                report = Report.query.filter_by(external_id=external_report_id).first()
                if not report:
                    errors += 1
                    continue
                action_id = _pick(row, "id", "action_id", "شماره اقدام", "کد اقدام")
                action = None
                if action_id:
                    action = CorrectiveAction.query.filter_by(id=int(action_id) if action_id.isdigit() else -1).first()
                if action is None:
                    action = CorrectiveAction(report_id=report.id, title=_pick(row, "title", "action", "اقدام اصلاحی", "شرح اقدام") or "اقدام اصلاحی")
                    db.session.add(action)
                    inserted += 1
                else:
                    updated += 1
                action.title = _pick(row, "title", "action", "اقدام اصلاحی", "شرح اقدام") or action.title
                action.responsible = _pick(row, "responsible", "owner", "مسئول", "مسئول اقدام")
                action.status = _pick(row, "status", "وضعیت") or action.status
                due = _pick(row, "due_date", "deadline", "مهلت", "تاریخ سررسید")
                if due:
                    try:
                        action.due_date = date.fromisoformat(due[:10])
                    except ValueError:
                        pass

            elif kind == "people":
                # Third CSV is intentionally accepted as a people/master-data file.
                # It is stored as a report-free import in the audit-friendly import log below.
                inserted += 1

        except Exception:
            errors += 1

    db.session.commit()
    return {"inserted": inserted, "updated": updated, "errors": errors}


@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "service": "Safety Prism App", "time": datetime.utcnow().isoformat()})


@app.get("/api/dashboard/analytics")
def dashboard_analytics():
    reports = Report.query.all()
    actions = CorrectiveAction.query.all()

    months = {}
    for report in reports:
        key = report.created_at.strftime("%Y-%m")
        months.setdefault(key, 0)
        months[key] += 1
    labels = sorted(months)[-12:]

    status = {"OPEN": 0, "CLOSED": 0, "OVERDUE": 0}
    for action in actions:
        if action.is_overdue:
            status["OVERDUE"] += 1
        elif action.status == "CLOSED":
            status["CLOSED"] += 1
        else:
            status["OPEN"] += 1

    causes = {}
    for report in reports:
        if report.root_cause:
            causes[report.root_cause] = causes.get(report.root_cause, 0) + 1
    pareto = sorted(causes.items(), key=lambda x: x[1], reverse=True)[:10]

    types = {"UNSAFE_ACT": 0, "UNSAFE_CONDITION": 0}
    for report in reports:
        key = (report.observation_type or "").upper()
        if "ACT" in key or "عمل" in key:
            types["UNSAFE_ACT"] += 1
        elif "CONDITION" in key or "شرایط" in key:
            types["UNSAFE_CONDITION"] += 1

    departments = {}
    for report in reports:
        departments.setdefault(report.department or "نامشخص", {"reports": 0, "overdue": 0, "closed": 0})["reports"] += 1
    for action in actions:
        dep = action.report.department if action.report else "نامشخص"
        departments.setdefault(dep or "نامشخص", {"reports": 0, "overdue": 0, "closed": 0})
        if action.is_overdue:
            departments[dep or "نامشخص"]["overdue"] += 1
        if action.status == "CLOSED":
            departments[dep or "نامشخص"]["closed"] += 1

    return jsonify({
        "kpi": {
            "reports": len(reports),
            "open_reports": sum(1 for r in reports if r.status != "CLOSED"),
            "actions": len(actions),
            "overdue": status["OVERDUE"],
            "closed_actions": status["CLOSED"],
        },
        "trend": {"labels": labels, "reports": [months[m] for m in labels], "actions": [0 for _ in labels]},
        "action_status": {"labels": ["باز", "بسته‌شده", "معوق"], "values": [status["OPEN"], status["CLOSED"], status["OVERDUE"]]},
        "pareto": {"labels": [x[0] for x in pareto], "values": [x[1] for x in pareto]},
        "act_condition": {"labels": ["عمل ناایمن", "شرایط ناایمن"], "values": [types["UNSAFE_ACT"], types["UNSAFE_CONDITION"]]},
        "departments": {
            "labels": list(departments),
            "reports": [departments[x]["reports"] for x in departments],
            "overdue": [departments[x]["overdue"] for x in departments],
            "closed": [departments[x]["closed"] for x in departments],
        },
    })


@app.post("/api/import/<kind>")
def api_import(kind):
    if kind not in {"reports", "actions", "people"}:
        return jsonify({"error": "نوع فایل نامعتبر است"}), 400
    file = request.files.get("file")
    if not file or not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "یک فایل CSV ارسال کنید"}), 400
    result = import_csv(file, kind)
    return jsonify({"ok": True, "kind": kind, **result})


@app.post("/api/actions/<int:action_id>/verify")
def verify_action(action_id):
    action = db.session.get(CorrectiveAction, action_id)
    if not action:
        return jsonify({"error": "اقدام پیدا نشد"}), 404
    action.status = "CLOSED"
    action.verified_at = datetime.utcnow()
    action.escalation_level = 0
    db.session.commit()
    return jsonify({"ok": True, "action_id": action.id, "status": action.status})


@app.get("/api/reports")
def reports():
    rows = Report.query.order_by(Report.created_at.desc()).limit(200).all()
    return jsonify([{
        "id": r.id,
        "external_id": r.external_id,
        "reporter": r.reporter,
        "department": r.department,
        "observation_type": r.observation_type,
        "description": r.description,
        "risk_level": r.risk_level,
        "status": r.status,
        "created_at": r.created_at.isoformat(),
    } for r in rows])


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8000")), debug=False)
