const cleanDirectoryRoutes = new Map([
  ["/ssl-simulator", "/ssl-simulator.html"],
  ["/ssl-simulator/", "/ssl-simulator.html"]
]);

const rewriteCleanDirectoryRoute = (request) => {
  if (!request.url) return;
  const [pathname, query = ""] = request.url.split("?", 2);
  const target = cleanDirectoryRoutes.get(pathname);
  if (!target) return;
  request.url = query ? `${target}?${query}` : target;
};

const cleanDirectoryRoutesPlugin = {
  name: "unatomo-clean-directory-routes",
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      rewriteCleanDirectoryRoute(request);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, _response, next) => {
      rewriteCleanDirectoryRoute(request);
      next();
    });
  }
};

export default {
  plugins: [cleanDirectoryRoutesPlugin]
};
