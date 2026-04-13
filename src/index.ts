import dotenv from "dotenv";
dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { configurePassport, passport } from './passport';

const app = express();
app.use(cors());
app.use(express.json());
configurePassport();
app.use(passport.initialize());

import  userRouter  from './routes/user';
// import  contentRouter  from './routes/content';


app.use('/api/v1/user', userRouter);
// app.use("/api/v1/content", contentRouter);

const MONGO_URL = process.env.MONGO_STRING as string;  //since using ts
const PORT = Number(process.env.PORT ?? 3000);

app.get("/api/v1/health", (_req, res) => {
    res.status(200).json({
        status: "ok"
    });
});


async function connectToDatabase() {
    try {
        if (!MONGO_URL) {
            throw new Error("MONGO_STRING is not defined in environment variables.");
        }
        await mongoose.connect(MONGO_URL);
        console.log("Connected to MongoDB");
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
    catch (err) {
        console.log("Error connecting to MongoDb", err);
    }
}

connectToDatabase();

