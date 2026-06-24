import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase, migrateDatabase } from "../src/db/database.js";
import { createLogger } from "../src/utils/logger.js";
import { createApp } from "../src/app.js";

function createTestServer() {
  const dir = mkdtempSync(join(tmpdir(), "bluemind-docs-test-"));
  const db = createDatabase(join(dir, "test.sqlite"));
  migrateDatabase(db);

  const config = {
    env: "test",
    host: "127.0.0.1",
    port: 0,
    databasePath: join(dir, "test.sqlite"),
    logLevel: "error",
    maxJsonBodyBytes: 1024 * 1024,
    imageStorageRoot: join(dir, "images"),
    corsOrigin: "*",
    devAuthUserId: "test-user",
    devAuthEmail: "test@example.com"
  };

  const server = createApp({ db, config, logger: createLogger("error") });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        db,
        close: async () => {
          await new Promise((done) => server.close(done));
          db.close();
          rmSync(dir, { recursive: true, force: true });
        }
      });
    });
  });
}

async function registerSession(baseUrl, suffix = Date.now()) {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: `test-${suffix}@example.com`, password: "password123" })
  });
  const json = await response.json();
  assert.equal(response.status, 201);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  return { cookie, user: json.data.user };
}

async function request(baseUrl, cookie, method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  return { response, json };
}

test("health confirms the server and database are available", async () => {
  const app = await createTestServer();
  try {
    const { response, json } = await request(app.baseUrl, null, "GET", "/health");
    assert.equal(response.status, 200);
    assert.equal(json.status, "ok");
    assert.equal(json.database, "connected");
  } finally {
    await app.close();
  }
});

test("does not serve frontend shell from the backend repository", async () => {
  const app = await createTestServer();
  try {
    const response = await fetch(`${app.baseUrl}/`);
    const json = await response.json();
    assert.equal(response.status, 404);
    assert.equal(json.error.code, "NOT_FOUND");
  } finally {
    await app.close();
  }
});

test("auth sessions, folders, pages, share links, content, and image upload persist", async () => {
  const app = await createTestServer();
  try {
    const { cookie, user } = await registerSession(app.baseUrl, "crud");
    assert.equal(user.email, "test-crud@example.com");

    let result = await request(app.baseUrl, cookie, "GET", "/api/auth/me");
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.user.id, user.id);

    result = await request(app.baseUrl, cookie, "POST", "/api/folders", { name: "Work" });
    assert.equal(result.response.status, 201);
    const folder = result.json.data;
    assert.equal(folder.name, "Work");
    assert.equal(folder.userId, user.id);

    result = await request(app.baseUrl, cookie, "PATCH", `/api/folders/${folder.id}`, { name: "Projects" });
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.name, "Projects");

    result = await request(app.baseUrl, cookie, "GET", "/api/folders");
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.length, 1);

    result = await request(app.baseUrl, cookie, "POST", `/api/folders/${folder.id}/pages`, {
      title: "Launch Notes",
      content: []
    });
    assert.equal(result.response.status, 201);
    const page = result.json.data;
    assert.equal(page.folderId, folder.id);

    result = await request(app.baseUrl, cookie, "POST", `/api/pages/${page.id}/share`, {});
    assert.equal(result.response.status, 201);
    const share = result.json.data;
    assert.match(share.url, /\/share\//);
    assert.equal(share.isPrivate, false);

    result = await request(app.baseUrl, cookie, "PATCH", `/api/pages/${page.id}/share`, { isPrivate: true });
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.isPrivate, true);

    result = await request(app.baseUrl, cookie, "PATCH", `/api/pages/${page.id}/content`, {
      content: [{ id: "heading-1", type: "heading", text: "Autosaved draft", styles: { fontSize: 32 } }]
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.content[0].text, "Autosaved draft");

    const formData = new FormData();
    formData.append("pageId", page.id);
    formData.append("altText", "Cover image");
    formData.append("image", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "cover.png");

    const uploadResponse = await fetch(`${app.baseUrl}/api/uploads/image`, {
      method: "POST",
      headers: { cookie },
      body: formData
    });
    const uploadJson = await uploadResponse.json();
    assert.equal(uploadResponse.status, 201);
    assert.equal(uploadJson.data.pageId, page.id);
    assert.match(uploadJson.data.url, /^\/uploads\/images\//);

    const imageResponse = await fetch(`${app.baseUrl}${uploadJson.data.url}`);
    assert.equal(imageResponse.status, 200);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");

    result = await request(app.baseUrl, cookie, "GET", `/api/pages/${page.id}`);
    assert.equal(result.response.status, 200);
    assert.equal(result.json.data.content[0].text, "Autosaved draft");

    assert.equal(app.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE user_id = ?").get(user.id).count, 1);
    assert.equal(app.db.prepare("SELECT COUNT(*) as count FROM page_share_links WHERE page_id = ?").get(page.id).count, 1);
  } finally {
    await app.close();
  }
});

test("validation, permission, and auth errors return structured JSON", async () => {
  const app = await createTestServer();
  try {
    let result = await request(app.baseUrl, null, "POST", "/api/folders", { name: "No auth" });
    assert.equal(result.response.status, 401);
    assert.equal(result.json.error.code, "UNAUTHORIZED");

    const { cookie } = await registerSession(app.baseUrl, "errors");
    result = await request(app.baseUrl, cookie, "POST", "/api/folders", { name: "" });
    assert.equal(result.response.status, 400);
    assert.equal(result.json.error.code, "BAD_REQUEST");

    result = await request(app.baseUrl, cookie, "GET", "/api/folders/missing-folder");
    assert.equal(result.response.status, 404);
    assert.equal(result.json.error.code, "NOT_FOUND");
  } finally {
    await app.close();
  }
});


