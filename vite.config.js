import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import adminUsers from "./api/admin-users.js";

function localAdminApi() {
  return {
    name: "kf-admin-users",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      server.middlewares.use("/api/admin-users", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
          process.env.SUPABASE_ANON_KEY =
            env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
          process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
          try {
            req.body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          } catch {
            req.body = {};
          }
          await adminUsers(req, {
            status(code) {
              res.statusCode = code;
              return this;
            },
            json(body) {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(body));
            },
          });
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localAdminApi()],
});
