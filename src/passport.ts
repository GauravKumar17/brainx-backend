import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import type { Request } from "express";
import { userModel } from "./db";

type OAuthProvider = "google" | "github";

type OAuthProfile = {
  id: string;
  displayName?: string;
  username?: string;
  photos?: Array<{ value?: string }>;
  emails?: Array<{ value?: string }>;
};

type VerifyDone = (error: Error | null, user?: unknown) => void;

async function findOrCreateOAuthUser(provider: OAuthProvider, profile: OAuthProfile) {
  const email = profile.emails?.[0]?.value;

  if (!email) {
    throw new Error(`${provider} account did not return an email address.`);
  }

  const existingUser = await userModel.findOne({
    $or: [
      { email },
      { provider, providerId: profile.id },
    ],
  });

  if (existingUser) {
    if (existingUser.provider !== provider || existingUser.providerId !== profile.id) {
      existingUser.provider = provider;
      existingUser.providerId = profile.id;
      existingUser.avatar = profile.photos?.[0]?.value;
      await existingUser.save();
    }

    return existingUser;
  }

  const baseUsername =
    profile.username ??
    profile.displayName?.replace(/\s+/g, "").toLowerCase() ??
    email.split("@")[0];

  let username = baseUsername.slice(0, 20) || `${provider}user`;
  let suffix = 1;

  while (await userModel.findOne({ username })) {
    username = `${baseUsername.slice(0, 15)}${suffix}`;
    suffix += 1;
  }

  return userModel.create({
    email,
    username,
    provider,
    providerId: profile.id,
    avatar: profile.photos?.[0]?.value,
  });
}

export function configurePassport() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";

  if (googleClientId && googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: `${backendUrl}/api/v1/user/auth/google/callback`,
          passReqToCallback: true,
        },
        (async (_req: Request, _accessToken: string, _refreshToken: string, profile: OAuthProfile, done: VerifyDone) => {
          try {
            const user = await findOrCreateOAuthUser("google", profile);
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }) as never
      )
    );
    console.log("Passport Google strategy enabled");
  } else {
    console.warn("Passport Google strategy disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing");
  }

  if (githubClientId && githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: `${backendUrl}/api/v1/user/auth/github/callback`,
          scope: ["user:email"],
          passReqToCallback: true,
        },
        (async (_req: Request, _accessToken: string, _refreshToken: string, profile: OAuthProfile, done: VerifyDone) => {
          try {
            const user = await findOrCreateOAuthUser("github", profile);
            done(null, user);
          } catch (error) {
            done(error as Error);
          }
        }) as never
      )
    );
    console.log("Passport GitHub strategy enabled");
  } else {
    console.warn("Passport GitHub strategy disabled: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing");
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}

export function isStrategyConfigured(name: string) {
  return Boolean((passport as unknown as { _strategy?: (strategy: string) => unknown })._strategy?.(name));
}

export { passport };
