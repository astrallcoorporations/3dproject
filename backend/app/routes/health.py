from flask import Blueprint, jsonify

health = Blueprint("health", __name__)


@health.get("/api/health")
def get_health():
    return jsonify({"status": "ok"})
