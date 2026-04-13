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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const auth_1 = require("../auth");
const passport_1 = require("../passport");
const middleware_1 = require("./middleware");
const userRouter = express_1.default.Router();
function buildOAuthRedirect(token, username) {
    const frontendUrl = (0, auth_1.getFrontendUrl)();
    const params = new URLSearchParams({
        token,
        username
    });
    return `${frontendUrl}/auth/callback?${params.toString()}`;
}
function ensureOAuthStrategy(strategy, res) {
    if (!(0, passport_1.isStrategyConfigured)(strategy)) {
        res.status(503).json({
            message: `${strategy} authentication is not configured on the server. Add the required OAuth client ID and secret in backend/.env and restart the backend.`
        });
        return false;
    }
    return true;
}
//----------------------------------Signup Route------------------------------------------
userRouter.post('/signup', ((req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    // Check if user already exists
    const email = req.body.email;
    const userExists = yield db_1.userModel.findOne({
        email: email
    });
    if (userExists) {
        return res.status(400).json({
            message: "User already exists"
        });
    }
    try {
        //---------------------Zod Validation--------------------------------------------------------
        const validateUser = zod_1.z.object({
            username: zod_1.z.string().min(3).max(20),
            password: zod_1.z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, { message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character", }),
            email: zod_1.z.string().min(5).max(50).email()
        });
        const parsedData = validateUser.safeParse(req.body);
        if (!parsedData.success) {
            return res.status(400).json({
                message: "Invalid user data",
                error: parsedData.error
            });
        }
        //--------------------------------------------------------------
        const email = req.body.email;
        const username = req.body.username;
        const password = req.body.password;
        const hashedPassword = yield bcrypt_1.default.hash(password, 5);
        const user = yield db_1.userModel.create({
            email: email,
            username: username,
            password: hashedPassword,
            provider: "local"
        });
        //  to signin the user from signuppage directly we need to create a JWT token to letter check the user is authenticated or not
        const token = (0, auth_1.signAuthToken)(user._id);
        return res.status(200).json({
            message: "Signup successful",
            token: token
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------Signin Route------------------------------------------
userRouter.post('/signin', ((req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const user = yield db_1.userModel.findOne({
            email: email
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        if (!user.password) {
            return res.status(400).json({
                message: "This account uses social login. Continue with Google or GitHub."
            });
        }
        const verifypasword = yield bcrypt_1.default.compare(password, user.password);
        if (verifypasword) {
            const token = (0, auth_1.signAuthToken)(user._id);
            console.log("User signed in successfully:", user.username);
            return res.status(200).json({
                message: "Signin successful",
                token: token,
                username: user.username
            });
        }
        else {
            return res.status(401).json({
                message: "Invalid password"
            });
        }
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------Add Contents Route------------------------------------------
userRouter.post('/contents', middleware_1.authMiddleware, ((req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const link = req.body.link;
        const title = req.body.title;
        const type = req.body.type;
        const uploadedAt = req.body.uploadedAt || new Date();
        yield db_1.contentModel.create({
            link: link,
            title: title,
            type: type,
            tags: [],
            userId: req.userId,
            uploadedAt: uploadedAt
        });
        return res.status(201).json({
            message: "Content added successfully"
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------Get Contents Route------------------------------------------
userRouter.get('/contents', middleware_1.authMiddleware, ((req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;
        const filter = {
            userId: userId
        };
        if (searchQuery) {
            filter.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { link: { $regex: searchQuery, $options: 'i' } },
                { type: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        const contents = yield db_1.contentModel.find(filter).populate('userId', 'username').sort({ uploadedAt: -1 });
        return res.status(200).json({
            contents: contents
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------OAuth Routes------------------------------------------
userRouter.get('/auth/google', ((req, res, next) => {
    if (!ensureOAuthStrategy("google", res)) {
        return;
    }
    return passport_1.passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
}));
userRouter.get('/auth/google/callback', ((req, res, next) => {
    if (!ensureOAuthStrategy("google", res)) {
        return;
    }
    return passport_1.passport.authenticate('google', { session: false, failureRedirect: `${(0, auth_1.getFrontendUrl)()}/?authError=google` })(req, res, next);
}), ((req, res) => {
    var _a;
    const user = req.user;
    if (!user) {
        return res.redirect(`${(0, auth_1.getFrontendUrl)()}/?authError=google`);
    }
    const token = (0, auth_1.signAuthToken)(user._id.toString());
    return res.redirect(buildOAuthRedirect(token, (_a = user.username) !== null && _a !== void 0 ? _a : "User"));
}));
userRouter.get('/auth/github', ((req, res, next) => {
    if (!ensureOAuthStrategy("github", res)) {
        return;
    }
    return passport_1.passport.authenticate('github', { scope: ['user:email'], session: false })(req, res, next);
}));
userRouter.get('/auth/github/callback', ((req, res, next) => {
    if (!ensureOAuthStrategy("github", res)) {
        return;
    }
    return passport_1.passport.authenticate('github', { session: false, failureRedirect: `${(0, auth_1.getFrontendUrl)()}/?authError=github` })(req, res, next);
}), ((req, res) => {
    var _a;
    const user = req.user;
    if (!user) {
        return res.redirect(`${(0, auth_1.getFrontendUrl)()}/?authError=github`);
    }
    const token = (0, auth_1.signAuthToken)(user._id.toString());
    return res.redirect(buildOAuthRedirect(token, (_a = user.username) !== null && _a !== void 0 ? _a : "User"));
}));
//----------------------------------Delete Contents Route------------------------------------------
userRouter.delete('/contents/:id', middleware_1.authMiddleware, ((req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const contentId = req.params.id;
        const userId = req.userId;
        const content = yield db_1.contentModel.deleteOne({
            _id: contentId,
            userId: userId
        });
        if (content.deletedCount === 0) {
            return res.status(404).json({
                message: "Content not found or unauthorized"
            });
        }
        return res.status(200).json({
            message: "Content deleted successfully"
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------Share Contents Route------------------------------------------
userRouter.post('/share', middleware_1.authMiddleware, ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        let shareLink = yield db_1.linksModel.findOne({ user: userId });
        if (!shareLink) {
            const hash = crypto_1.default.randomBytes(8).toString('hex');
            shareLink = yield db_1.linksModel.create({ hash, user: userId });
        }
        const shareUrl = `${(0, auth_1.getFrontendUrl)()}/share/${shareLink.hash}`;
        return res.status(200).json({
            shareUrl,
            message: "Share link created successfully"
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
//----------------------------------Get Shared Links Route------------------------------------------
userRouter.get('/share/:shareLink', ((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const shareLink = req.params.shareLink;
        const link = yield db_1.linksModel.findOne({ hash: shareLink }).populate('user', 'username');
        if (!link) {
            return res.status(404).json({ message: "Share link not found" });
        }
        const contents = yield db_1.contentModel.find({ userId: link.user }).sort({ uploadedAt: -1 });
        return res.status(200).json({
            contents,
            sharedBy: (_b = (_a = link.user) === null || _a === void 0 ? void 0 : _a.username) !== null && _b !== void 0 ? _b : "Unknown"
        });
    }
    catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})));
exports.default = userRouter;
