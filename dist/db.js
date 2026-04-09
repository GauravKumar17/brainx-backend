"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.linksModel = exports.contentModel = exports.tagsModel = exports.userModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ObjectId = mongoose_1.Schema.Types.ObjectId;
const UserSchema = new mongoose_1.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, unique: true }
});
const TagsSchema = new mongoose_1.Schema({
    title: { type: String, unique: true, required: true }
});
const ContentsSchema = new mongoose_1.Schema({
    link: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    tags: [{ type: ObjectId, ref: 'tags' }],
    userId: { type: ObjectId, ref: 'user', required: true },
    uploadedAt: { type: Date, default: Date.now }
});
const LinksSchema = new mongoose_1.Schema({
    hash: { type: String, required: true },
    user: { type: ObjectId, ref: 'user', required: true }
});
const userModel = mongoose_1.default.model('user', UserSchema);
exports.userModel = userModel;
const tagsModel = mongoose_1.default.model('tags', TagsSchema);
exports.tagsModel = tagsModel;
const contentModel = mongoose_1.default.model('contents', ContentsSchema);
exports.contentModel = contentModel;
const linksModel = mongoose_1.default.model('links', LinksSchema);
exports.linksModel = linksModel;
