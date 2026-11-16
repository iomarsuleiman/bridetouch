export default {
  async fetch(request, env) {
    if (!["GET","HEAD"].includes(request.method)) return new Response("Method not allowed",{status:405,headers:{Allow:"GET, HEAD"}});
    const response = await env.ASSETS.fetch(request);
    const result = new Response(response.body,response);
    result.headers.set("X-Content-Type-Options","nosniff");
    result.headers.set("Referrer-Policy","strict-origin-when-cross-origin");
    result.headers.set("Permissions-Policy","camera=(), microphone=(), geolocation=()");
    const path = new URL(request.url).pathname;
    if (response.headers.get("Content-Type")?.includes("text/html") || path === "/sw.js" || path.endsWith(".webmanifest")) result.headers.set("Cache-Control","no-cache, no-store, must-revalidate");
    return result;
  }
};
