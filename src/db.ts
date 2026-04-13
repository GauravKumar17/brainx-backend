import mongoose, { Schema, Document, Types } from 'mongoose';
const ObjectId = Schema.Types.ObjectId;

interface IUser extends Document {
    username:string;
    password?:string;
    email:string;
    provider: "local" | "google" | "github";
    providerId?: string;
    avatar?: string;
    _id: Types.ObjectId;
}

interface ITags extends Document {
    title:{type:string,unique:true,required:true};
}

interface IContents extends Document {
    link: { type: string; required: true };
    title: { type: string; required: true };
    type: { type: string; required: true };
    tags: [{ type: Types.ObjectId }];
    userId: { type: Types.ObjectId,required:true };
    uploadedAt?: Date;
}

interface ILinks extends Document {
    hash: { type: string; required: true };
    user:{type:Types.ObjectId,required:true};
}



const UserSchema = new Schema<IUser>({
    username: { type: String, required: true, unique: true },
    password: { type: String },
    email: { type: String, unique: true, required: true },
    provider: { type: String, enum: ["local", "google", "github"], default: "local" },
    providerId: { type: String },
    avatar: { type: String }
})


const TagsSchema = new Schema<ITags>({
    title: { type: String, unique: true, required: true }
})


const ContentsSchema = new Schema<IContents>({
    link: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    tags: [{ type: ObjectId, ref: 'tags' }],
    userId: { type: ObjectId, ref: 'user', required: true },
    uploadedAt: { type: Date, default: Date.now }
})


const LinksSchema = new Schema<ILinks>({
    hash: { type: String, required: true, unique: true },
    user: { type: ObjectId, ref: 'user', required: true }       
})



const userModel = mongoose.model<IUser>('user', UserSchema);
const tagsModel = mongoose.model<ITags>('tags', TagsSchema);
const contentModel = mongoose.model<IContents>('contents',ContentsSchema);
const linksModel = mongoose.model<ILinks>('links',LinksSchema);

export{userModel,tagsModel,contentModel,linksModel};
