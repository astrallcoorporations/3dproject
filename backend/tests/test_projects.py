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


def test_reloading_a_project_restores_its_saved_rig_and_timeline(tmp_path):
    """Covers the public GET/PUT boundary the studio's reload flow depends
    on: a three-joint, two-bone rig and a two-keyframe timeline saved
    through PUT must come back byte-for-byte from a later GET, exactly as
    the browser does after a page reload."""
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'puppet.db'}",
        }
    )
    client = app.test_client()
    project = client.post("/api/projects", json={"name": "Nova"}).get_json()

    rig = {
        "joints": {
            "leftShoulder": {"x": 0.3, "y": 0.2},
            "leftElbow": {"x": 0.35, "y": 0.45},
            "leftWrist": {"x": 0.4, "y": 0.7},
        },
        "bones": [
            {
                "id": "leftUpperArm",
                "label": "L. upper arm",
                "start": "leftShoulder",
                "end": "leftElbow",
                "parentId": None,
                "proxyWidth": 16,
                "selection": {"x": 0.26, "y": 0.16, "width": 0.09, "height": 0.29},
            },
            {
                "id": "leftForearm",
                "label": "L. forearm",
                "start": "leftElbow",
                "end": "leftWrist",
                "parentId": "leftUpperArm",
                "proxyWidth": 14,
                "selection": {"x": 0.31, "y": 0.41, "width": 0.09, "height": 0.29},
            },
        ],
    }
    timeline = {
        "fps": 24,
        "keyframes": [
            {"frame": 0, "pose": {"leftUpperArm": {"rotation": [0, 0, 0], "position": [0, 0, 0]}}},
            {"frame": 24, "pose": {"leftUpperArm": {"rotation": [0, 1.2, 0], "position": [0, 0, 0]}}},
        ],
    }

    updated = client.put(f"/api/projects/{project['id']}", json={"rig": rig, "timeline": timeline})
    assert updated.status_code == 200
    assert updated.get_json()["rig"] == rig
    assert updated.get_json()["timeline"] == timeline

    reloaded = client.get(f"/api/projects/{project['id']}").get_json()
    assert len(reloaded["rig"]["joints"]) == 3
    assert len(reloaded["rig"]["bones"]) == 2
    assert len(reloaded["timeline"]["keyframes"]) == 2
    assert reloaded["rig"] == rig
    assert reloaded["timeline"] == timeline
