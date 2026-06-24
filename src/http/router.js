function splitPath(pathname) {
  return pathname.split("/").filter(Boolean);
}

function matchRoute(pattern, pathname) {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(pathname);
  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }

    if (expected !== actual) return null;
  }

  return params;
}

export function createRouter() {
  const routes = [];

  function add(method, path, handler) {
    routes.push({ method, path, handler });
  }

  async function handle(ctx) {
    for (const route of routes) {
      if (route.method !== ctx.req.method) continue;
      const params = matchRoute(route.path, ctx.url.pathname);
      if (!params) continue;

      ctx.params = params;
      await route.handler(ctx);
      return true;
    }
    return false;
  }

  return {
    get: (path, handler) => add("GET", path, handler),
    post: (path, handler) => add("POST", path, handler),
    patch: (path, handler) => add("PATCH", path, handler),
    delete: (path, handler) => add("DELETE", path, handler),
    handle
  };
}
