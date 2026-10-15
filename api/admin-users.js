import { createClient } from "@supabase/supabase-js";

function env(name, fallback) {
  return process.env[name] || process.env[fallback] || "";
}

function initials(name) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function json(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !serviceKey) {
    json(res, 500, {
      error:
        "Account changes need the SUPABASE_SERVICE_ROLE_KEY secret on the server.",
    });
    return;
  }

  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = String(header).replace(/^Bearer\s+/i, "");
  if (!token) {
    json(res, 401, { error: "Sign in again, then retry." });
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: checked, error: authError } = await admin.auth.getUser(token);
  const callerAuth = checked && checked.user;
  if (authError || !callerAuth) {
    json(res, 401, { error: "Sign in again, then retry." });
    return;
  }

  const { data: caller, error: callerError } = await admin
    .from("kf_users")
    .select("id, role, auth_id")
    .eq("auth_id", callerAuth.id)
    .maybeSingle();
  if (callerError || !caller || caller.role !== "admin") {
    json(res, 403, { error: "Only an admin can change accounts." });
    return;
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const action = body.action;
  const roles = ["staff", "supervisor", "admin"];

  try {
    if (action === "create") {
      const name = String(body.name || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      const role = body.role;
      const title = String(body.title || "").trim();
      if (!name || !email || !email.includes("@") || !title || !roles.includes(role)) {
        json(res, 400, { error: "Name, email, role, and job title are required." });
        return;
      }
      if (password.length < 6) {
        json(res, 400, { error: "Use a password of at least 6 characters." });
        return;
      }
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError || !created.user) {
        json(res, 400, { error: createError?.message || "Couldn't create the login." });
        return;
      }
      const { data: row, error: insertError } = await admin
        .from("kf_users")
        .insert({
          name,
          email,
          role,
          job_title: title,
          avatar: initials(name),
          annual_left: 12,
          auth_id: created.user.id,
        })
        .select("id, name, email, role, job_title, avatar, annual_left, auth_id")
        .single();
      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id);
        json(res, 400, { error: insertError.message });
        return;
      }
      json(res, 200, { user: row });
      return;
    }

    if (action === "update" || action === "set-password") {
      const userId = Number(body.userId);
      const { data: target, error: targetError } = await admin
        .from("kf_users")
        .select("id, email, auth_id, role")
        .eq("id", userId)
        .maybeSingle();
      if (targetError || !target) {
        json(res, 404, { error: "That person is not on the team list." });
        return;
      }
      const patch = {};
      const password = String(body.password || "");
      if (password) {
        if (password.length < 6) {
          json(res, 400, { error: "Use a password of at least 6 characters." });
          return;
        }
        patch.password = password;
      }
      let email = target.email;
      if (action === "update") {
        email = String(body.email || "").trim().toLowerCase();
        const role = body.role;
        const name = String(body.name || "").trim();
        const title = String(body.title || "").trim();
        if (!name || !email || !email.includes("@") || !title || !roles.includes(role)) {
          json(res, 400, { error: "Name, email, role, and job title are required." });
          return;
        }
        if (email !== target.email) {
          patch.email = email;
          patch.email_confirm = true;
        }
        if (Object.keys(patch).length) {
          const { error: authUpdateError } = await admin.auth.admin.updateUserById(
            target.auth_id,
            patch,
          );
          if (authUpdateError) {
            json(res, 400, { error: authUpdateError.message });
            return;
          }
        }
        const { data: row, error: updateError } = await admin
          .from("kf_users")
          .update({
            name,
            email,
            role,
            job_title: title,
            avatar: initials(name),
          })
          .eq("id", userId)
          .select("id, name, email, role, job_title, avatar, annual_left, auth_id")
          .single();
        if (updateError) {
          json(res, 400, { error: updateError.message });
          return;
        }
        json(res, 200, { user: row });
        return;
      }
      if (!patch.password) {
        json(res, 400, { error: "Enter a new password." });
        return;
      }
      const { error: passwordError } = await admin.auth.admin.updateUserById(
        target.auth_id,
        { password: patch.password },
      );
      if (passwordError) {
        json(res, 400, { error: passwordError.message });
        return;
      }
      json(res, 200, { ok: true });
      return;
    }

    if (action === "delete") {
      const userId = Number(body.userId);
      const { data: target, error: targetError } = await admin
        .from("kf_users")
        .select("id, role, auth_id")
        .eq("id", userId)
        .maybeSingle();
      if (targetError || !target) {
        json(res, 404, { error: "That person is not on the team list." });
        return;
      }
      if (target.auth_id === callerAuth.id) {
        json(res, 400, { error: "You can't delete your own login." });
        return;
      }
      if (target.role === "admin") {
        const { count } = await admin
          .from("kf_users")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if ((count || 0) <= 1) {
          json(res, 400, { error: "Keep at least one admin." });
          return;
        }
      }
      const { error: deleteRowError } = await admin.from("kf_users").delete().eq("id", userId);
      if (deleteRowError) {
        json(res, 400, { error: deleteRowError.message });
        return;
      }
      if (target.auth_id) await admin.auth.admin.deleteUser(target.auth_id);
      json(res, 200, { ok: true });
      return;
    }

    json(res, 400, { error: "Unknown action." });
  } catch (err) {
    json(res, 500, { error: err.message || "Account change failed." });
  }
}
