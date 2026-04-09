import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

import  userRouter  from './routes/user';
// import  contentRouter  from './routes/content';


app.use('/api/v1/user', userRouter);
// app.use("/api/v1/content", contentRouter);

const MONGO_URL = process.env.MONGO_STRING as string;  //since using ts


async function connectToDatabase() {
    try {
        if (!MONGO_URL) {
            throw new Error("MONGO_STRING is not defined in environment variables.");
        }
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");
        app.listen(3000, () => console.log("Server running on port 3000"));
    }
    catch (err) {
        console.log("Error connecting to MongoDb", err);
    }
}

connectToDatabase();

