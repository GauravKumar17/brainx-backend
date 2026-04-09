"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
//:void is used to indicate that the function does not return a value
//This is useful for TypeScript to understand the return type of the function
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization;
    // Check if token is present and JWT_SECRET is defined(compulsory for ts)
    if (!token || !JWT_SECRET) {
        res.status(401).json({ message: "Missing token or secret" });
        return;
    }
    try {
        const verifyToken = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if verifyToken is a string, which indicates an error
        // This can happen if the token is invalid or expired(JWT.verify returns a string in case of an error)
        //(since using typescript, it is compulsory to check)
        if (typeof verifyToken === "string") {
            res.status(401).json({ message: "Invalid token format" });
            return;
        }
        if (verifyToken) {
            req.userId = verifyToken.userId;
            //The return type of JWT.verify() is: string(on error) | JwtPayload ,So TypeScript complains if you directly write: req.userId = verifyToken.userId; ,because it doesn’t know if verifyToken is a string or an object.
            //hence first we check if verifyToken is not a string, then we can safely access userId.
            //verifyToken as JwtPayload is used to tell TypeScript that verifyToken is of type JwtPayload, which has the userId property.
            //This is a type assertion, which tells TypeScript to treat verifyToken as a JwtPayload object.
            // similarly req.userId will give error as Request in express does not have userId property
            //so we need to add userId property to Request interface in types/express/index.d.ts
            //This is done to avoid TypeScript errors when accessing req.userId in the route handlers
            //hence we made a index.d.ts file in types/express/index.d.ts
            //and added the userId property to the Request interface.
            next();
        }
        else {
            res.status(401).json({ message: "Unauthorized access" });
        }
    }
    catch (_a) {
        res.status(401).json({
            message: "Unauthorized access"
        });
        return;
    }
};
exports.authMiddleware = authMiddleware;
