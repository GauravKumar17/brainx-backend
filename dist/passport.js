"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passport = void 0;
exports.configurePassport = configurePassport;
exports.isStrategyConfigured = isStrategyConfigured;
const passport_1 = __importDefault(require("passport"));
exports.passport = passport_1.default;
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const db_1 = require("./db");
function findOrCreateOAuthUser(provider, profile) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
        if (!email) {
            throw new Error(`${provider} account did not return an email address.`);
        }
        const existingUser = yield db_1.userModel.findOne({
            $or: [
                { email },
                { provider, providerId: profile.id },
            ],
        });
        if (existingUser) {
            if (existingUser.provider !== provider || existingUser.providerId !== profile.id) {
                existingUser.provider = provider;
                existingUser.providerId = profile.id;
                existingUser.avatar = (_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value;
                yield existingUser.save();
            }
            return existingUser;
        }
        const baseUsername = (_g = (_e = profile.username) !== null && _e !== void 0 ? _e : (_f = profile.displayName) === null || _f === void 0 ? void 0 : _f.replace(/\s+/g, "").toLowerCase()) !== null && _g !== void 0 ? _g : email.split("@")[0];
        let username = baseUsername.slice(0, 20) || `${provider}user`;
        let suffix = 1;
        while (yield db_1.userModel.findOne({ username })) {
            username = `${baseUsername.slice(0, 15)}${suffix}`;
            suffix += 1;
        }
        return db_1.userModel.create({
            email,
            username,
            provider,
            providerId: profile.id,
            avatar: (_j = (_h = profile.photos) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.value,
        });
    });
}
function configurePassport() {
    var _a;
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
    const backendUrl = (_a = process.env.BACKEND_URL) !== null && _a !== void 0 ? _a : "http://localhost:3000";
    if (googleClientId && googleClientSecret) {
        passport_1.default.use(new passport_google_oauth20_1.Strategy({
            clientID: googleClientId,
            clientSecret: googleClientSecret,
            callbackURL: `${backendUrl}/api/v1/user/auth/google/callback`,
            passReqToCallback: true,
        }, ((_req, _accessToken, _refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield findOrCreateOAuthUser("google", profile);
                done(null, user);
            }
            catch (error) {
                done(error);
            }
        }))));
        console.log("Passport Google strategy enabled");
    }
    else {
        console.warn("Passport Google strategy disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing");
    }
    if (githubClientId && githubClientSecret) {
        passport_1.default.use(new passport_github2_1.Strategy({
            clientID: githubClientId,
            clientSecret: githubClientSecret,
            callbackURL: `${backendUrl}/api/v1/user/auth/github/callback`,
            scope: ["user:email"],
            passReqToCallback: true,
        }, ((_req, _accessToken, _refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield findOrCreateOAuthUser("github", profile);
                done(null, user);
            }
            catch (error) {
                done(error);
            }
        }))));
        console.log("Passport GitHub strategy enabled");
    }
    else {
        console.warn("Passport GitHub strategy disabled: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing");
    }
    passport_1.default.serializeUser((user, done) => {
        done(null, user);
    });
    passport_1.default.deserializeUser((user, done) => {
        done(null, user);
    });
}
function isStrategyConfigured(name) {
    var _a, _b;
    return Boolean((_b = (_a = passport_1.default)._strategy) === null || _b === void 0 ? void 0 : _b.call(_a, name));
}
