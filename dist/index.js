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
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const user_1 = __importDefault(require("./routes/user"));
// import  contentRouter  from './routes/content';
app.use('/api/v1/user', user_1.default);
// app.use("/api/v1/content", contentRouter);
const MONGO_URL = process.env.MONGO_STRING; //since using ts
function connectToDatabase() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!MONGO_URL) {
                throw new Error("MONGO_STRING is not defined in environment variables.");
            }
            yield mongoose_1.default.connect(MONGO_URL);
            console.log("Connected to MongoDB");
            app.listen(3000, () => console.log("Server running on port 3000"));
        }
        catch (err) {
            console.log("Error connecting to MongoDb", err);
        }
    });
}
connectToDatabase();
