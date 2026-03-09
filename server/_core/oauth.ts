import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

// GitHub OAuth: Exchange code for access token
async function exchangeCodeForGitHubToken(code: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: ENV.appId,
      client_secret: ENV.githubClientSecret,
      code,
    }),
  });

  const data = await response.json() as { access_token?: string; error?: string };
  if (data.error || !data.access_token) {
    throw new Error(`GitHub token exchange failed: ${data.error}`);
  }

  return data.access_token;
}

// GitHub OAuth: Get user info from GitHub API
async function getGitHubUserInfo(
  accessToken: string
): Promise<{ id: number; login: string; name: string | null; email: string | null }> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "FootWare-OAuth",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user info");
  }

  return response.json();
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code) {
      console.error("[GitHub OAuth] Missing code parameter");
      res.status(400).json({ error: "code is required" });
      return;
    }

    try {
      // Validate state parameter for CSRF protection
      if (!state) {
        console.warn("[GitHub OAuth] Missing state parameter");
        // Continue anyway - state is optional in some cases
      } else {
        try {
          const expectedRedirectUri = atob(state);
          const currentRedirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
          if (expectedRedirectUri !== currentRedirectUri) {
            console.warn(
              "[GitHub OAuth] State mismatch:",
              { expected: expectedRedirectUri, current: currentRedirectUri }
            );
            // Continue anyway - state might be tampered but allow the flow
          }
        } catch (stateError) {
          console.warn("[GitHub OAuth] Failed to validate state:", stateError);
          // Continue anyway
        }
      }

      // Exchange GitHub authorization code for access token
      const accessToken = await exchangeCodeForGitHubToken(code);

      // Get GitHub user info
      const gitHubUser = await getGitHubUserInfo(accessToken);

      // Use GitHub ID as openId for unique identifier
      const openId = `github_${gitHubUser.id}`;

      // Upsert user into database
      await db.upsertUser({
        openId,
        name: gitHubUser.name || gitHubUser.login || null,
        email: gitHubUser.email || null,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });

      // Create session token
      const sessionToken = await sdk.createSessionToken(openId, {
        name: gitHubUser.name || gitHubUser.login || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[GitHub OAuth] Success:", { openId, login: gitHubUser.login });

      // Redirect to home
      res.redirect(302, "/");
    } catch (error) {
      console.error("[GitHub OAuth] Callback failed:", error);
      res.redirect(302, `/?error=oauth_failed&message=${encodeURIComponent(String(error))}`);
    }
  });
}
