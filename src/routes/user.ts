import dotenv from "dotenv";
dotenv.config()
import express, { Request, Response, NextFunction,RequestHandler } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { userModel, contentModel, linksModel } from '../db';
import { signAuthToken, getFrontendUrl } from '../auth';
import { passport, isStrategyConfigured } from '../passport';

import { authMiddleware } from './middleware';
const userRouter = express.Router();

function buildOAuthRedirect(token: string, username: string) {
    const frontendUrl = getFrontendUrl();
    const params = new URLSearchParams({
        token,
        username
    });

    return `${frontendUrl}/auth/callback?${params.toString()}`;
}

function ensureOAuthStrategy(strategy: "google" | "github", res: Response) {
    if (!isStrategyConfigured(strategy)) {
        res.status(503).json({
            message: `${strategy} authentication is not configured on the server. Add the required OAuth client ID and secret in backend/.env and restart the backend.`
        });
        return false;
    }

    return true;
}



//----------------------------------Signup Route------------------------------------------

userRouter.post('/signup', (async(req:Request,res:Response , _next:NextFunction)=> {

    // Check if user already exists
    const email = req.body.email;
    const userExists = await userModel.findOne({
        email:email 
    })
    if(userExists){
        return res.status(400).json({
            message:"User already exists"
        })
    }


try{
    

//---------------------Zod Validation--------------------------------------------------------
    const validateUser = z.object({
        username:z.string().min(3).max(20),
        password:z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,{message:
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",}),
        email:z.string().min(5).max(50).email()
    })
    const parsedData = validateUser.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({
            message:"Invalid user data",
            error:parsedData.error
        });
    }
//--------------------------------------------------------------
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;

    const hashedPassword = await bcrypt.hash(password,5);

    const user = await userModel.create({
        email:email,
        username:username,
        password:hashedPassword,
        provider: "local"
    })

    //  to signin the user from signuppage directly we need to create a JWT token to letter check the user is authenticated or not

        const token = signAuthToken(user._id);

        return res.status(200).json({
            message:"Signup successful",
            token:token
        })

}catch(err){
        res.status(500).json({ message: "Internal server error", error: err });
    }   


})as RequestHandler);


//----------------------------------Signin Route------------------------------------------


userRouter.post('/signin', (async(req:Request,res:Response,_next:NextFunction)=>{
    try{
        const email = req.body.email;
        const password = req.body.password;

        const user = await userModel.findOne({
            email:email
        })
        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        if (!user.password) {
            return res.status(400).json({
                message:"This account uses social login. Continue with Google or GitHub."
            })
        }

        const verifypasword  = await bcrypt.compare(password,user.password);

        if(verifypasword){
            const token = signAuthToken(user._id);

                console.log("User signed in successfully:", user.username)
            return res.status(200).json({
                message:"Signin successful",
                token:token,
                username: user.username
            })

        }else{
            return res.status(401).json({
                message:"Invalid password"
            })
        }

    }catch(err){
        res.status(500).json({ message: "Internal server error", error: err });
    }

})as RequestHandler);


//----------------------------------Add Contents Route------------------------------------------


userRouter.post('/contents', authMiddleware, (async (req: Request, res: Response , _next:NextFunction) => {

    try{
        const link = req.body.link;
        const title = req.body.title;
        const type = req.body.type;
        const uploadedAt = req.body.uploadedAt || new Date();

        await contentModel.create({
            link:link,
            title:title,
            type:type,
            tags: [],
            userId:req.userId,
            uploadedAt: uploadedAt
            
        })

        return res.status(201).json({
            message: "Content added successfully"
        });

    }
    catch(err){
        res.status(500).json({ message: "Internal server error", error: err });
    }

})as RequestHandler);


//----------------------------------Get Contents Route------------------------------------------


userRouter.get('/contents', authMiddleware, (async (req: Request, res: Response , _next:NextFunction) => {
    try{
        const userId = req.userId;
        const searchQuery = typeof req.query.q === 'string' ? req.query.q.trim() : undefined;

        const filter: Record<string, unknown> = {
            userId: userId
        };

        if (searchQuery) {
            filter.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { link: { $regex: searchQuery, $options: 'i' } },
                { type: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        const contents = await contentModel.find(filter).populate('userId', 'username').sort({ uploadedAt: -1 });

        return res.status(200).json({
            contents: contents
        });
    }catch(err){
        res.status(500).json({ message: "Internal server error", error: err }); 
    }
})as RequestHandler);


//----------------------------------OAuth Routes------------------------------------------

userRouter.get(
    '/auth/google',
    ((req: Request, res: Response, next: NextFunction) => {
        if (!ensureOAuthStrategy("google", res)) {
            return;
        }

        return (passport.authenticate('google', { scope: ['profile', 'email'], session: false }) as RequestHandler)(req, res, next);
    }) as RequestHandler
);

userRouter.get(
    '/auth/google/callback',
    ((req: Request, res: Response, next: NextFunction) => {
        if (!ensureOAuthStrategy("google", res)) {
            return;
        }

        return (passport.authenticate('google', { session: false, failureRedirect: `${getFrontendUrl()}/?authError=google` }) as RequestHandler)(req, res, next);
    }) as RequestHandler,
    ((req: Request, res: Response) => {
        const user = req.user as typeof req.user & { _id: { toString(): string }, username?: string } | undefined;

        if (!user) {
            return res.redirect(`${getFrontendUrl()}/?authError=google`);
        }

        const token = signAuthToken(user._id.toString());
        return res.redirect(buildOAuthRedirect(token, user.username ?? "User"));
    }) as RequestHandler
);

userRouter.get(
    '/auth/github',
    ((req: Request, res: Response, next: NextFunction) => {
        if (!ensureOAuthStrategy("github", res)) {
            return;
        }

        return (passport.authenticate('github', { scope: ['user:email'], session: false }) as RequestHandler)(req, res, next);
    }) as RequestHandler
);

userRouter.get(
    '/auth/github/callback',
    ((req: Request, res: Response, next: NextFunction) => {
        if (!ensureOAuthStrategy("github", res)) {
            return;
        }

        return (passport.authenticate('github', { session: false, failureRedirect: `${getFrontendUrl()}/?authError=github` }) as RequestHandler)(req, res, next);
    }) as RequestHandler,
    ((req: Request, res: Response) => {
        const user = req.user as typeof req.user & { _id: { toString(): string }, username?: string } | undefined;

        if (!user) {
            return res.redirect(`${getFrontendUrl()}/?authError=github`);
        }

        const token = signAuthToken(user._id.toString());
        return res.redirect(buildOAuthRedirect(token, user.username ?? "User"));
    }) as RequestHandler
);



//----------------------------------Delete Contents Route------------------------------------------


userRouter.delete('/contents/:id', authMiddleware,(async (req: Request, res: Response , _next:NextFunction) => {
    try{
        const contentId = req.params.id;
        
        const userId = req.userId;

        const content = await contentModel.deleteOne({
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

    }catch(err){
        res.status(500).json({ message: "Internal server error", error: err });
    }
})as RequestHandler);



//----------------------------------Share Contents Route------------------------------------------

userRouter.post('/share', authMiddleware, (async (req: Request, res: Response , next:NextFunction) => {
    try {
        const userId = req.userId;

        let shareLink = await linksModel.findOne({ user: userId });
        if (!shareLink) {
            const hash = crypto.randomBytes(8).toString('hex');
            shareLink = await linksModel.create({ hash, user: userId });
        }

        const shareUrl = `${getFrontendUrl()}/share/${shareLink.hash}`;

        return res.status(200).json({
            shareUrl,
            message: "Share link created successfully"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})as RequestHandler);

//----------------------------------Get Shared Links Route------------------------------------------

userRouter.get('/share/:shareLink', (async (req: Request, res: Response , next:NextFunction) => {
    try {
        const shareLink = req.params.shareLink;

        const link = await linksModel.findOne({ hash: shareLink }).populate('user', 'username');
        if (!link) {
            return res.status(404).json({ message: "Share link not found" });
        }

        const contents = await contentModel.find({ userId: link.user }).sort({ uploadedAt: -1 });

        return res.status(200).json({
            contents,
            sharedBy: (link.user as any)?.username ?? "Unknown"
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err });
    }
})as RequestHandler);


export default userRouter;



