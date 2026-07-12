from __future__ import annotations

from flask import Flask
from flask_cors import CORS

from app.models import db


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY="puppet-local",
        TESTING=False,
        SQLALCHEMY_DATABASE_URI="sqlite:///puppet.db",
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        MAX_CONTENT_LENGTH=12 * 1024 * 1024,
        UPLOAD_FOLDER=str(app.instance_path + "/uploads"),
    )
    if test_config:
        app.config.update(test_config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)

    from app.routes.health import health
    from app.routes.projects import projects

    app.register_blueprint(health)
    app.register_blueprint(projects)
    with app.app_context():
        db.create_all()
    return app
