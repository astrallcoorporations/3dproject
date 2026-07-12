from app import create_app


def test_creating_project_uses_the_builtin_studio_owner(tmp_path):
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'puppet.db'}",
        }
    )
    client = app.test_client()

    created = client.post("/api/projects", json={"name": "Nova"})

    assert created.status_code == 201
    payload = created.get_json()
    assert payload["name"] == "Nova"
    assert payload["ownerId"] == "studio-local"
    assert payload["rig"] == {}
    assert client.get(f"/api/projects/{payload['id']}").get_json()["id"] == payload["id"]
