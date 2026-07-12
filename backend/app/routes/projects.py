from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request, send_from_directory
from PIL import Image, UnidentifiedImageError

from app.image_refinement import RefinementSettings, refine_image
from app.models import Asset, Project, db

projects = Blueprint("projects", __name__)


def project_payload(project: Project) -> dict:
    return {
        "id": project.id,
        "ownerId": project.owner_id,
        "name": project.name,
        "rig": project.rig_json,
        "timeline": project.timeline_json,
        "activeAssetId": project.active_asset_id,
        "assets": [asset_payload(asset) for asset in project.assets],
    }


def asset_payload(asset: Asset) -> dict:
    return {
        "id": asset.id,
        "projectId": asset.project_id,
        "kind": asset.kind,
        "url": f"/uploads/{asset.relative_path}",
        "width": asset.width,
        "height": asset.height,
    }


def upload_directory() -> Path:
    folder = Path(current_app.config["UPLOAD_FOLDER"])
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def valid_name(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    name = payload.get("name")
    if not isinstance(name, str):
        return None
    cleaned = name.strip()
    return cleaned if 1 <= len(cleaned) <= 80 else None


@projects.post("/api/projects")
def create_project():
    name = valid_name(request.get_json(silent=True))
    if not name:
        return jsonify({"error": "Project name must be 1–80 characters."}), 400

    project = Project(name=name)
    db.session.add(project)
    db.session.commit()
    return jsonify(project_payload(project)), 201


@projects.get("/api/projects/<int:project_id>")
def get_project(project_id: int):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify({"error": "Project not found."}), 404
    return jsonify(project_payload(project))


@projects.put("/api/projects/<int:project_id>")
def update_project(project_id: int):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify({"error": "Project not found."}), 404

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Expected a JSON object."}), 400
    if "name" in payload:
        name = valid_name(payload)
        if not name:
            return jsonify({"error": "Project name must be 1–80 characters."}), 400
        project.name = name
    if isinstance(payload.get("rig"), dict):
        project.rig_json = payload["rig"]
    if isinstance(payload.get("timeline"), dict):
        project.timeline_json = payload["timeline"]
    if isinstance(payload.get("activeAssetId"), int):
        project.active_asset_id = payload["activeAssetId"]
    db.session.commit()
    return jsonify(project_payload(project))


@projects.post("/api/projects/<int:project_id>/assets")
def upload_asset(project_id: int):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify({"error": "Project not found."}), 404
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return jsonify({"error": "Choose an image to upload."}), 400
    if uploaded.mimetype not in {"image/png", "image/jpeg", "image/webp"}:
        return jsonify({"error": "Use a PNG, JPEG, or WebP image."}), 415

    try:
        image = Image.open(uploaded.stream)
        image.verify()
        uploaded.stream.seek(0)
        image = Image.open(uploaded.stream).convert("RGBA")
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "The uploaded file is not a readable image."}), 400

    file_name = f"original-{uuid4().hex}.png"
    image.save(upload_directory() / file_name, format="PNG")
    asset = Asset(
        project_id=project.id,
        kind="original",
        relative_path=file_name,
        width=image.width,
        height=image.height,
    )
    db.session.add(asset)
    db.session.flush()
    project.active_asset_id = asset.id
    db.session.commit()
    return jsonify(asset_payload(asset)), 201


@projects.post("/api/assets/<int:asset_id>/refine")
def refine_asset(asset_id: int):
    asset = db.session.get(Asset, asset_id)
    if asset is None:
        return jsonify({"error": "Asset not found."}), 404
    payload = request.get_json(silent=True) or {}
    try:
        settings = RefinementSettings(
            contrast=float(payload.get("contrast", 1.15)),
            cleanup=bool(payload.get("cleanup", True)),
            palette_size=int(payload.get("paletteSize", 12)),
        )
        output_name = f"refined-{uuid4().hex}.png"
        output_path = upload_directory() / output_name
        metadata = refine_image(upload_directory() / asset.relative_path, output_path, settings)
    except (TypeError, ValueError):
        return jsonify({"error": "Refinement settings are invalid."}), 400

    refined = Asset(
        project_id=asset.project_id,
        kind="refined",
        relative_path=output_name,
        width=metadata.width,
        height=metadata.height,
    )
    db.session.add(refined)
    db.session.flush()
    project = db.session.get(Project, asset.project_id)
    project.active_asset_id = refined.id
    db.session.commit()
    return jsonify(asset_payload(refined)), 201


@projects.get("/uploads/<path:filename>")
def get_uploaded_asset(filename: str):
    return send_from_directory(upload_directory(), filename)
