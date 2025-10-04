import { bench, describe } from "vitest";
import { match, parse, pathToRegexp } from "./index.js";

const PATHS: string[] = [
  "/xyz",
  "/user",
  "/user/123",
  "/" + "a".repeat(32_000),
  "/-" + "-a".repeat(8_000) + "/-",
  "/||||\x00|" + "||".repeat(27387) + "|\x00".repeat(27387) + "/||/",
];

// Static paths for cache testing
const STATIC_PATHS = [
  "/",
  "/user",
  "/api/users",
  "/api/posts",
  "/api/comments",
  "/static/css/main.css",
  "/static/js/app.js",
];

// Dynamic paths for cache testing
const DYNAMIC_PATHS = [
  "/user/:id",
  "/api/users/:userId",
  "/api/posts/:postId",
  "/api/users/:userId/posts/:postId",
  "/:section/:category/:item",
];

describe("matching benchmarks", () => {
  const STATIC_PATH_MATCH = match("/user");
  const SIMPLE_PATH_MATCH = match("/user/:id");
  const MULTI_SEGMENT_MATCH = match("/:x/:y");
  const MULTI_PATTERN_MATCH = match("/:x-:y");
  const TRICKY_PATTERN_MATCH = match("/:foo|:bar|");
  const ASTERISK_MATCH = match("/*foo");

  bench("static path", () => {
    for (const path of PATHS) STATIC_PATH_MATCH(path);
  });

  bench("simple path", () => {
    for (const path of PATHS) SIMPLE_PATH_MATCH(path);
  });

  bench("multi segment", () => {
    for (const path of PATHS) MULTI_SEGMENT_MATCH(path);
  });

  bench("multi pattern", () => {
    for (const path of PATHS) MULTI_PATTERN_MATCH(path);
  });

  bench("tricky pattern", () => {
    for (const path of PATHS) TRICKY_PATTERN_MATCH(path);
  });

  bench("asterisk", () => {
    for (const path of PATHS) ASTERISK_MATCH(path);
  });
});

describe("cache effectiveness", () => {
  bench("static route compilation (cached)", () => {
    for (const path of STATIC_PATHS) {
      pathToRegexp(path);
    }
  });

  bench("dynamic route compilation (cached)", () => {
    for (const path of DYNAMIC_PATHS) {
      pathToRegexp(path);
    }
  });

  bench("parse caching", () => {
    for (const path of DYNAMIC_PATHS) {
      parse(path);
    }
  });

  bench("static route matching (fast path)", () => {
    const matchers = STATIC_PATHS.map((p) => match(p));
    for (const matcher of matchers) {
      matcher("/user");
    }
  });
});

describe("real-world scenarios", () => {
  // Simulate Express-style routing
  const routes = [
    "/",
    "/api/health",
    "/api/users",
    "/api/users/:id",
    "/api/users/:userId/posts",
    "/api/users/:userId/posts/:postId",
    "/api/users/:userId/posts/:postId/comments",
    "/api/users/:userId/posts/:postId/comments/:commentId",
    "/static/*path",
    "/files/*filepath",
  ];

  bench("route compilation (10 routes)", () => {
    for (const route of routes) {
      pathToRegexp(route);
    }
  });

  bench("route matching (10 routes, varied)", () => {
    const matchers = routes.map((r) => match(r));
    const testPaths = [
      "/",
      "/api/health",
      "/api/users",
      "/api/users/123",
      "/api/users/123/posts",
      "/api/users/123/posts/456",
      "/api/users/123/posts/456/comments",
      "/api/users/123/posts/456/comments/789",
      "/static/css/main.css",
      "/files/documents/report.pdf",
    ];

    for (const path of testPaths) {
      for (const matcher of matchers) {
        matcher(path);
      }
    }
  });

  bench("high-frequency static route matching", () => {
    const matcher = match("/api/health");
    for (let i = 0; i < 1000; i++) {
      matcher("/api/health");
    }
  });

  bench("high-frequency dynamic route matching", () => {
    const matcher = match("/api/users/:id");
    for (let i = 0; i < 1000; i++) {
      matcher("/api/users/123");
    }
  });
});
