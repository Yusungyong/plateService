const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const DEFAULT_BASE_URL = "https://foodplayserver.shop";
const DEFAULT_ORIGIN = "http://localhost:3001";

main().catch((error) => {
  console.error(`\nFAIL ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  loadEnvFile(".env.development");
  loadEnvFile(".env.production");

  const baseUrl = trimTrailingSlash(
    process.env.PLATE_API_BASE_URL ||
      process.env.REACT_APP_API_BASE_URL ||
      DEFAULT_BASE_URL
  );
  const origin = process.env.PLATE_TEST_ORIGIN || DEFAULT_ORIGIN;
  const username = process.env.PLATE_TEST_USERNAME || "";
  const password = process.env.PLATE_TEST_PASSWORD || "";
  const allowWrites = process.env.PLATE_E2E_ALLOW_WRITES === "true";
  const keepRecord = process.env.PLATE_E2E_KEEP_RECORD === "true";
  const expectAdmin = process.env.PLATE_TEST_EXPECT_ADMIN === "true";
  const restaurantTitle = process.env.PLATE_E2E_RESTAURANT_TITLE || "";

  console.log(`Server smoke target: ${baseUrl}`);
  console.log(`Browser origin check: ${origin}`);

  await checkUnauthenticatedRestaurantList(baseUrl);
  await checkCorsPreflight(baseUrl, origin);

  if (!username || !password) {
    console.log("\nSKIP authenticated checks: set PLATE_TEST_USERNAME and PLATE_TEST_PASSWORD.");
    console.log("SKIP write checks: authenticated checks are required first.");
    return;
  }

  const session = await login(baseUrl, username, password);
  const claims = decodeJwtPayload(session.accessToken);
  const authority = inspectAuthority(claims);

  console.log(`PASS login returned access/refresh tokens for ${username}`);
  console.log(`Token roles: ${authority.roles.join(", ") || "-"}`);
  console.log(`Token permissions: ${authority.permissions.join(", ") || "-"}`);

  if (expectAdmin && !authority.isAdmin) {
    throw new Error("PLATE_TEST_EXPECT_ADMIN=true but token is not admin.");
  }

  await checkAuthenticatedRestaurantList(baseUrl, session.accessToken);

  if (authority.isAdmin) {
    await checkAdminMonitoringSummary(baseUrl, session.accessToken);
  } else {
    console.log("SKIP admin monitoring summary: token is not admin.");
  }

  if (!allowWrites) {
    console.log("SKIP CRUD write checks: set PLATE_E2E_ALLOW_WRITES=true to create/update/delete a test store.");
    return;
  }

  await checkRestaurantCrud(baseUrl, session.accessToken, {
    keepRecord,
    restaurantTitle,
  });
}

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

async function checkUnauthenticatedRestaurantList(baseUrl) {
  const response = await request(baseUrl, {
    method: "GET",
    path: "/api/admin/restaurants?page=0&size=1",
  });

  if (![401, 403].includes(response.status)) {
    throw new Error(`Expected unauthenticated restaurant list to be denied, got ${response.status}.`);
  }

  console.log(`PASS unauthenticated restaurant list denied with ${response.status}`);
}

async function checkCorsPreflight(baseUrl, origin) {
  const response = await request(baseUrl, {
    method: "OPTIONS",
    path: "/api/admin/restaurants?page=0&size=1",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });

  const allowOrigin = response.headers["access-control-allow-origin"] || "";
  const allowMethods = response.headers["access-control-allow-methods"] || "";

  if (response.status >= 500) {
    throw new Error(`CORS preflight failed with server error ${response.status}.`);
  }

  if (!allowOrigin || response.status >= 400) {
    console.log(`WARN CORS preflight status ${response.status}; allow-origin is empty.`);
    return;
  }

  console.log(`PASS CORS preflight ${response.status}; allow-origin=${allowOrigin}; methods=${allowMethods || "-"}`);
}

async function login(baseUrl, username, password) {
  const response = await request(baseUrl, {
    method: "POST",
    path: "/api/auth/login",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      username,
      password,
      deviceId: "server-smoke-test",
      deviceModel: "Node.js",
      os: "web",
      osVersion: process.platform,
      appVersion: "server-smoke-test",
    },
  });

  if (response.status !== 200) {
    throw new Error(`Login failed with ${response.status}: ${safeMessage(response.body)}`);
  }

  const accessToken = response.body && response.body.data && response.body.data.accessToken;
  const refreshToken = response.body && response.body.data && response.body.data.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error("Login response is missing accessToken or refreshToken.");
  }

  return { accessToken, refreshToken };
}

async function checkAuthenticatedRestaurantList(baseUrl, accessToken) {
  const response = await request(baseUrl, {
    method: "GET",
    path: "/api/admin/restaurants?page=0&size=1",
    token: accessToken,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Authenticated restaurant list was denied with ${response.status}.`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Authenticated restaurant list returned ${response.status}: ${safeMessage(response.body)}`);
  }

  console.log(`PASS authenticated restaurant list returned ${response.status}`);
}

async function checkAdminMonitoringSummary(baseUrl, accessToken) {
  const response = await request(baseUrl, {
    method: "GET",
    path: "/api/admin/member-monitoring/summary",
    token: accessToken,
  });

  if (response.status === 403) {
    throw new Error("Token is admin, but member monitoring summary returned 403.");
  }

  if (response.status === 404) {
    console.log("WARN admin monitoring summary endpoint returned 404.");
    return;
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Admin monitoring summary returned ${response.status}: ${safeMessage(response.body)}`);
  }

  console.log(`PASS admin monitoring summary returned ${response.status}`);
}

async function checkRestaurantCrud(baseUrl, accessToken, options = {}) {
  const marker = options.restaurantTitle || `E2E Smoke ${new Date().toISOString()}`;
  let restaurantId = null;

  try {
    const imageUpload = await uploadTestFile(baseUrl, accessToken, {
      filename: "smoke-image.png",
      contentType: "image/png",
      content: createTestPng(),
    });
    const videoUpload = await uploadTestFile(baseUrl, accessToken, {
      filename: "smoke-video.mp4",
      contentType: "video/mp4",
      content: createTestMp4(),
    });
    const representativeImage = toMediaPayload(imageUpload, {
      mediaType: "image",
      usageType: "representative",
      displayOrder: 0,
    });
    const representativeVideo = toMediaPayload(videoUpload, {
      mediaType: "video",
      usageType: "representative",
      displayOrder: 1,
    });
    const menuImage = toMediaPayload(imageUpload, {
      mediaType: "image",
      usageType: "menu",
      displayOrder: 0,
    });
    const menuVideo = toMediaPayload(videoUpload, {
      mediaType: "video",
      usageType: "menu",
      displayOrder: 1,
    });

    console.log("PASS upload image returned fileUrl");
    console.log("PASS upload video returned fileUrl");

    const createResponse = await request(baseUrl, {
      method: "POST",
      path: "/api/admin/restaurants",
      token: accessToken,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        title: marker,
        address: "Seoul test address",
        phone: "02-0000-0000",
        businessHours: "Test hours",
        introduction: "Temporary smoke test record.",
        exposureStatus: "draft",
        categories: ["기타"],
        media: [representativeImage, representativeVideo],
        menus: [
          {
            name: "Smoke Test Menu",
            price: 12345,
            description: "Temporary smoke test menu.",
            displayOrder: 0,
            media: [menuImage, menuVideo],
          },
        ],
      },
    });

    if (createResponse.status < 200 || createResponse.status >= 300) {
      throw new Error(`Create restaurant returned ${createResponse.status}: ${safeMessage(createResponse.body)}`);
    }

    restaurantId =
      (createResponse.body && createResponse.body.data && createResponse.body.data.restaurantId) ||
      (createResponse.body && createResponse.body.data && createResponse.body.data.id) ||
      (createResponse.body && createResponse.body.restaurantId) ||
      (createResponse.body && createResponse.body.id);

    if (!restaurantId) {
      throw new Error("Create restaurant response did not include restaurantId.");
    }

    console.log(`PASS create restaurant returned id=${restaurantId}`);
    console.log(`Created restaurant title: ${marker}`);

    const detailResponse = await request(baseUrl, {
      method: "GET",
      path: `/api/admin/restaurants/${restaurantId}`,
      token: accessToken,
    });

    if (detailResponse.status < 200 || detailResponse.status >= 300) {
      throw new Error(`Fetch created restaurant returned ${detailResponse.status}: ${safeMessage(detailResponse.body)}`);
    }

    console.log(`PASS fetch created restaurant returned ${detailResponse.status}`);
    assertCreatedRestaurantDetail(detailResponse.body, {
      marker,
      imageUrl: imageUpload.fileUrl,
      videoUrl: videoUpload.fileUrl,
    });
    console.log("PASS created restaurant detail includes representative image/video and menu media");

    const updateResponse = await request(baseUrl, {
      method: "PUT",
      path: `/api/admin/restaurants/${restaurantId}`,
      token: accessToken,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        title: marker,
        address: "Seoul updated test address",
        phone: "02-1111-1111",
        businessHours: "Updated test hours",
        introduction: "Updated temporary smoke test record.",
        exposureStatus: "draft",
        categories: ["기타"],
        media: [representativeImage, representativeVideo],
        menus: [
          {
            name: "Smoke Test Menu Updated",
            price: 23456,
            description: "Updated temporary smoke test menu.",
            displayOrder: 0,
            media: [menuImage, menuVideo],
          },
        ],
      },
    });

    if (updateResponse.status < 200 || updateResponse.status >= 300) {
      throw new Error(`Update restaurant returned ${updateResponse.status}: ${safeMessage(updateResponse.body)}`);
    }

    console.log(`PASS update restaurant returned ${updateResponse.status}`);

    const updatedDetailResponse = await request(baseUrl, {
      method: "GET",
      path: `/api/admin/restaurants/${restaurantId}`,
      token: accessToken,
    });

    if (updatedDetailResponse.status < 200 || updatedDetailResponse.status >= 300) {
      throw new Error(
        `Fetch updated restaurant returned ${updatedDetailResponse.status}: ${safeMessage(updatedDetailResponse.body)}`
      );
    }

    assertUpdatedRestaurantDetail(updatedDetailResponse.body);
    console.log("PASS updated restaurant detail includes updated menu");
  } finally {
    if (restaurantId && options.keepRecord) {
      console.log(`KEEP restaurant id=${restaurantId}; cleanup delete skipped by PLATE_E2E_KEEP_RECORD=true`);
      return;
    }

    if (restaurantId) {
      const deleteResponse = await request(baseUrl, {
        method: "DELETE",
        path: `/api/admin/restaurants/${restaurantId}`,
        token: accessToken,
      });

      if (deleteResponse.status < 200 || deleteResponse.status >= 300) {
        console.log(`WARN cleanup delete returned ${deleteResponse.status}: ${safeMessage(deleteResponse.body)}`);
      } else {
        console.log(`PASS cleanup delete returned ${deleteResponse.status}`);
      }
    }
  }
}

async function uploadTestFile(baseUrl, accessToken, file) {
  const boundary = `----plate-smoke-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`,
      "utf8"
    ),
    file.content,
    Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
  ]);

  const response = await request(baseUrl, {
    method: "POST",
    path: "/api/admin/files",
    token: accessToken,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Upload ${file.filename} returned ${response.status}: ${safeMessage(response.body)}`);
  }

  const payload = unwrapData(response.body);
  const fileUrl = payload.fileUrl || payload.file_url || payload.url;

  if (!fileUrl) {
    throw new Error(`Upload ${file.filename} response is missing fileUrl.`);
  }

  return {
    fileUrl,
    originalName: payload.originalName || payload.original_name || file.filename,
    mimeType: payload.mimeType || payload.mime_type || file.contentType,
    fileSizeBytes: payload.fileSizeBytes || payload.file_size_bytes || file.content.length,
  };
}

function toMediaPayload(uploadedFile, options) {
  return {
    mediaType: options.mediaType,
    usageType: options.usageType,
    fileUrl: uploadedFile.fileUrl,
    originalName: uploadedFile.originalName,
    mimeType: uploadedFile.mimeType,
    fileSizeBytes: uploadedFile.fileSizeBytes,
    displayOrder: options.displayOrder,
  };
}

function assertCreatedRestaurantDetail(body, expected) {
  const detail = unwrapData(body);
  const media = Array.isArray(detail.media) ? detail.media : [];
  const menus = Array.isArray(detail.menus) ? detail.menus : [];
  const menu = menus.find((item) => item.name === "Smoke Test Menu");

  if (!String(detail.title || "").includes(expected.marker)) {
    throw new Error("Created restaurant detail title does not match the smoke marker.");
  }

  if (!media.some((item) => isMedia(item, "image", "representative", expected.imageUrl))) {
    throw new Error("Created restaurant detail is missing representative image media.");
  }

  if (!media.some((item) => isMedia(item, "video", "representative", expected.videoUrl))) {
    throw new Error("Created restaurant detail is missing representative video media.");
  }

  if (!menu) {
    throw new Error("Created restaurant detail is missing test menu.");
  }

  const menuMedia = Array.isArray(menu.media) ? menu.media : [];

  if (!menuMedia.some((item) => isMedia(item, "image", "menu", expected.imageUrl))) {
    throw new Error("Created restaurant detail is missing menu image media.");
  }

  if (!menuMedia.some((item) => isMedia(item, "video", "menu", expected.videoUrl))) {
    throw new Error("Created restaurant detail is missing menu video media.");
  }
}

function assertUpdatedRestaurantDetail(body) {
  const detail = unwrapData(body);
  const menus = Array.isArray(detail.menus) ? detail.menus : [];
  const menu = menus.find((item) => item.name === "Smoke Test Menu Updated");

  if (!String(detail.address || "").includes("updated")) {
    throw new Error("Updated restaurant detail address did not change.");
  }

  if (!menu) {
    throw new Error("Updated restaurant detail is missing updated test menu.");
  }

  if (Number(menu.price) !== 23456) {
    throw new Error("Updated restaurant detail menu price did not change.");
  }
}

function isMedia(item, mediaType, usageType, fileUrl) {
  const itemMediaType = item.mediaType || item.media_type;
  const itemUsageType = item.usageType || item.usage_type;
  const itemFileUrl = item.fileUrl || item.file_url || item.url;

  return itemMediaType === mediaType && itemUsageType === usageType && itemFileUrl === fileUrl;
}

function request(baseUrl, options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, baseUrl);
    const transport = url.protocol === "http:" ? http : https;
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    let body = null;

    if (options.body !== undefined) {
      if (Buffer.isBuffer(options.body)) {
        body = options.body;
      } else {
        body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
      }
      headers["Content-Length"] = Buffer.byteLength(body);
    }

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const requestOptions = {
      method: options.method,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      headers,
    };

    const req = transport.request(requestOptions, (res) => {
      const chunks = [];

      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: parseBody(text, res.headers["content-type"] || ""),
          text,
        });
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timed out: ${options.method} ${url.href}`));
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function parseBody(text, contentType) {
  if (!text) {
    return null;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }

  return text;
}

function unwrapData(body) {
  return body && body.data ? body.data : body || {};
}

function createTestPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l9T0WQAAAABJRU5ErkJggg==",
    "base64"
  );
}

function createTestMp4() {
  return Buffer.from(
    [
      "000000186674797069736f6d0000020069736f6d69736f32",
      "0000000866726565",
      "000000086d646174",
    ].join(""),
    "hex"
  );
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");

  if (parts.length < 2) {
    return {};
  }

  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (error) {
    return {};
  }
}

function inspectAuthority(claims) {
  const roles = collectValues(claims.roles, claims.role, claims.auth, claims.authorities).map(normalizeAuthority);
  const permissions = collectValues(
    claims.permissions,
    claims.permission,
    claims.scope,
    claims.scopes
  ).map(normalizeAuthority);

  return {
    roles,
    permissions,
    isAdmin:
      roles.includes("ADMIN") ||
      roles.includes("SUPER_ADMIN") ||
      permissions.includes("ADMIN_ACCESS"),
    canManageRestaurants:
      permissions.includes("RESTAURANT_MANAGE") ||
      permissions.includes("ADMIN_ACCESS") ||
      roles.includes("ADMIN") ||
      roles.includes("SUPER_ADMIN"),
  };
}

function collectValues() {
  return Array.from(arguments).flatMap((value) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String);
    }

    return String(value)
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  });
}

function normalizeAuthority(value) {
  return String(value).trim().toUpperCase().replace(/^ROLE_/, "");
}

function safeMessage(body) {
  if (!body) {
    return "-";
  }

  if (typeof body === "string") {
    return body.slice(0, 200);
  }

  return body.message || body.error || body.code || JSON.stringify(body).slice(0, 200);
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
