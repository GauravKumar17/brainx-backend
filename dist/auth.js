"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAuthToken = signAuthToken;
exports.getFrontendUrl = getFrontendUrl;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
function signAuthToken(userId) {
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in your environment.");
    }
    return jsonwebtoken_1.default.sign({
        userId: userId.toString(),
    }, JWT_SECRET);
}
function getFrontendUrl() {
    var _a;
    return (_a = process.env.FRONTEND_URL) !== null && _a !== void 0 ? _a : "http://localhost:5173";
}
