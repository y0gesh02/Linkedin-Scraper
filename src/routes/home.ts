import type { FastifyInstance } from "fastify";

const HOME_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>LinkedIn Profile API</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  p.sub { color: #555; margin-top: 0; }
  label { display: block; margin-top: 14px; font-weight: 600; font-size: 0.9rem; }
  input[type="text"], input[type="password"] { width: 100%; padding: 8px; margin-top: 4px; box-sizing: border-box; font-size: 0.95rem; border: 1px solid #ccc; border-radius: 4px; }
  .checkbox-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
  .checkbox-row label { margin: 0; font-weight: 500; }
  button { margin-top: 18px; padding: 10px 20px; font-size: 0.95rem; cursor: pointer; border: none; border-radius: 4px; background: #0a66c2; color: white; }
  button:disabled { opacity: 0.6; cursor: default; }
  pre { background: #f4f4f4; padding: 12px; margin-top: 16px; overflow-x: auto; border-radius: 4px; min-height: 60px; white-space: pre-wrap; word-break: break-word; font-size: 0.85rem; }
  .status { font-weight: 600; margin-top: 14px; }
  a { color: #0a66c2; }
</style>
</head>
<body>
  <h1>LinkedIn Profile API</h1>
  <p class="sub">Test console for <code>POST /api/v1/profile</code>.</p>

  <label for="apiKey">X-API-Key</label>
  <input type="password" id="apiKey" placeholder="API key not required at this time" autocomplete="off" />
  <label for="url">LinkedIn profile URL</label>
  <input type="text" id="url" placeholder="https://www.linkedin.com/in/williamhgates" autocomplete="off" />

  <div class="checkbox-row">
    <input type="checkbox" id="refresh" />
    <label for="refresh">refresh (bypass cache)</label>
  </div>

  <button id="submit" type="button">Fetch profile</button>
  <p id="status" class="status"></p>
  <pre id="result">Response will appear here…</pre>

  <script>
    const $ = (id) => document.getElementById(id);

    $("apiKey").value = localStorage.getItem("apiKey") || "";
    $("url").value = localStorage.getItem("lastUrl") || "";

    $("submit").addEventListener("click", async () => {
      const apiKey = $("apiKey").value.trim();
      const url = $("url").value.trim();
      const refresh = $("refresh").checked;
      const button = $("submit");

      localStorage.setItem("apiKey", apiKey);
      localStorage.setItem("lastUrl", url);

      button.disabled = true;
      $("status").textContent = "Loading…";
      $("result").textContent = "";

      try {
        const res = await fetch("/api/v1/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({ url, refresh }),
        });
        const body = await res.json();
        $("status").textContent = res.status + " " + res.statusText;
        $("result").textContent = JSON.stringify(body, null, 2);
      } catch (err) {
        $("status").textContent = "Request failed";
        $("result").textContent = String(err);
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
`;

export default async function homeRoute(fastify: FastifyInstance) {
  fastify.get("/", async (_request, reply) => {
    reply.type("text/html").send(HOME_PAGE);
  });
}
