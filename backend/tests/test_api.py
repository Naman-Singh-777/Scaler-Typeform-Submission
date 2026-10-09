import os, tempfile
os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/t.db"
from fastapi.testclient import TestClient
from app.main import app


def test_flow():
    with TestClient(app) as c:
        forms = c.get("/api/forms").json()
        assert len(forms) == 3 and forms[0]["response_count"] >= 0
        f = c.post("/api/forms", json={"title": "T"}).json()
        fid, q0 = f["id"], f["questions"][0]["id"]
        assert c.post(f"/api/forms/{fid}/publish").status_code == 422  # untitled question
        c.patch(f"/api/questions/{q0}", json={"title": "Name?", "required": True})
        q1 = c.post(f"/api/forms/{fid}/questions", json={"type": "email"}).json()["id"]
        c.patch(f"/api/questions/{q1}", json={"title": "Email?"})
        q2 = c.post(f"/api/forms/{fid}/questions", json={"type": "rating"}).json()["id"]
        c.patch(f"/api/questions/{q2}", json={"title": "Rate", "required": True})
        order = c.put(f"/api/forms/{fid}/questions/order", json={"question_ids": [q2, q0, q1]}).json()
        assert [q["id"] for q in order] == [q2, q0, q1]
        assert c.post(f"/api/forms/{fid}/publish").json()["status"] == "published"
        slug = f["slug"]
        pub = c.get(f"/api/public/forms/{slug}").json()
        rid = c.post(f"/api/public/forms/{slug}/responses").json()["id"]
        bad = c.post(f"/api/public/forms/{slug}/responses/{rid}/submit", json={"answers": {q0: "A", q1: "nope", q2: 9}})
        assert bad.status_code == 422 and set(bad.json()["detail"]["errors"]) == {str(q1), str(q2)}
        ok = c.post(f"/api/public/forms/{slug}/responses/{rid}/submit", json={"answers": {q0: "A", q1: "a@b.co", q2: 4}})
        assert ok.status_code == 201
        assert c.post(f"/api/public/forms/{slug}/responses/{rid}/submit", json={"answers": {}}).status_code == 409
        s = c.get(f"/api/forms/{fid}/summary").json()
        assert s["completions"] == 1 and s["starts"] == 1 and s["completion_rate"] == 100
        assert "4,A,a@b.co" in c.get(f"/api/forms/{fid}/responses/export.csv").text.replace(" ", "")
        c.post(f"/api/forms/{fid}/unpublish")
        assert c.get(f"/api/public/forms/{slug}").status_code == 404
        d = c.post(f"/api/forms/{fid}/duplicate").json()
        assert d["status"] == "draft" and len(d["questions"]) == 3
        assert c.delete(f"/api/forms/{fid}").status_code == 204


def test_branching_skips_required():
    with TestClient(app) as c:
        f = next(x for x in c.get("/api/forms").json() if x["title"].startswith("Customer"))
        form = c.get(f"/api/forms/{f['id']}").json()
        qs = {q["position"]: q["id"] for q in form["questions"]}
        rid = c.post(f"/api/public/forms/{f['slug']}/responses").json()["id"]
        ans = {qs[0]: "Z", qs[1]: "z@z.com", qs[2]: 5, qs[4]: True}  # yes -> skips the long-text question
        assert c.post(f"/api/public/forms/{f['slug']}/responses/{rid}/submit", json={"answers": ans}).status_code == 201


def test_site_and_auth():
    with TestClient(app) as c:
        content = c.get("/api/site/content").json()
        assert len(content["stories"]) == 3 and len(content["integrations"]) == 9
        assert c.post("/api/contact-sales", json={"name": "A", "email": "a@b.co", "message": "hi"}).status_code == 201
        assert c.post("/api/contact-sales", json={"name": "A", "email": "nope"}).status_code == 422
        assert c.post("/api/newsletter", json={"email": "a@b.co"}).status_code == 201

        r = c.post("/api/auth/signup", json={"name": "Nina", "email": "Nina@Example.com", "password": "secret123"})
        assert r.status_code == 201
        tok = r.json()["token"]
        assert c.post("/api/auth/signup", json={"name": "N", "email": "nina@example.com", "password": "secret123"}).status_code == 409
        assert c.post("/api/auth/login", json={"email": "nina@example.com", "password": "wrong-pass"}).status_code == 401
        assert c.post("/api/auth/login", json={"email": "nina@example.com", "password": "secret123"}).status_code == 200
        h = {"Authorization": f"Bearer {tok}"}
        assert c.get("/api/auth/me", headers=h).json()["email"] == "nina@example.com"
        # a new account starts with its own empty workspace; anonymous requests still see the demo creator's forms
        assert c.get("/api/forms", headers=h).json() == []
        assert len(c.get("/api/forms").json()) >= 3


def test_file_upload_question():
    import base64
    with TestClient(app) as c:
        f = c.post("/api/forms", json={"title": "Files"}).json()
        fid, slug, q0 = f["id"], f["slug"], f["questions"][0]["id"]
        q = c.post(f"/api/forms/{fid}/questions", json={"type": "file_upload"}).json()["id"]
        c.patch(f"/api/questions/{q0}", json={"title": "Name"})
        c.patch(f"/api/questions/{q}", json={"title": "Your CV", "required": True})
        assert c.post(f"/api/forms/{fid}/publish").status_code == 200
        rid = c.post(f"/api/public/forms/{slug}/responses").json()["id"]
        url = f"/api/public/forms/{slug}/responses/{rid}/submit"
        assert c.post(url, json={"answers": {q0: "A"}}).status_code == 422  # required file missing
        big = base64.b64encode(b"x" * (5 * 1024 * 1024 + 1)).decode()
        assert c.post(url, json={"answers": {q0: "A", q: {"name": "big.bin", "data": big}}}).status_code == 422
        data = base64.b64encode(b"hello file").decode()
        ok = c.post(url, json={"answers": {q0: "A", q: {"name": "cv.txt", "type": "text/plain", "data": data}}})
        assert ok.status_code == 201
        resp = c.get(f"/api/forms/{fid}/responses/{rid}").json()
        ref = resp["answers"][str(q)]
        assert ref["name"] == "cv.txt" and ref["size"] == 10 and "data" not in ref
        dl = c.get(f"/api/forms/{fid}/files/{ref['file_id']}")
        assert dl.status_code == 200 and dl.content == b"hello file" and "attachment" in dl.headers["content-disposition"]
        assert "cv.txt" in c.get(f"/api/forms/{fid}/responses/export.csv").text
        assert c.get(f"/api/forms/{fid}/summary").json()["questions"][1]["latest"] == ["cv.txt"]
