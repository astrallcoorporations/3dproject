import io

from PIL import Image

from app import create_app


def png_upload() -> io.BytesIO:
    buffer = io.BytesIO()
    Image.new("RGBA", (20, 14), (200, 120, 80, 255)).save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def test_upload_and_refine_asset_creates_a_new_project_asset(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'puppet.db'}",
            "UPLOAD_FOLDER": str(tmp_path / "uploads"),
        }
    )
    client = app.test_client()
    project = client.post("/api/projects", json={"name": "Nova"}).get_json()

    uploaded = client.post(
        f"/api/projects/{project['id']}/assets",
        data={"file": (png_upload(), "nova.png")},
        content_type="multipart/form-data",
    )

    assert uploaded.status_code == 201
    asset = uploaded.get_json()
    assert asset["kind"] == "original"
    assert asset["width"] == 20
    refined = client.post(
        f"/api/assets/{asset['id']}/refine",
        json={"contrast": 1.2, "cleanup": True, "paletteSize": 8},
    )
    assert refined.status_code == 201
    assert refined.get_json()["kind"] == "refined"
    assert refined.get_json()["width"] == 20
