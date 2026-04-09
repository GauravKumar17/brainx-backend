import dotenv from "dotenv";
dotenv.config()
import {Request,Response,NextFunction} from 'express';
import JWT, { JwtPayload } from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET;

//:void is used to indicate that the function does not return a value
//This is useful for TypeScript to understand the return type of the function
export const authMiddleware = (req: Request, res: Response, next: NextFunction):void => { 
    const token = req.headers.authorization;
    // Check if token is present and JWT_SECRET is defined(compulsory for ts)
    if (!token || !JWT_SECRET) {
        res.status(401).json({ message: "Missing token or secret" });
        return ;
    }
    try{
    const verifyToken = JWT.verify(token, JWT_SECRET );

    // Check if verifyToken is a string, which indicates an error
    // This can happen if the token is invalid or expired(JWT.verify returns a string in case of an error)
    //(since using typescript, it is compulsory to check)
    if (typeof verifyToken === "string") {
        res.status(401).json({ message: "Invalid token format" });
        return ;
    }

    if(verifyToken){
        req.userId = (verifyToken as JwtPayload).userId; 
    
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
    else{
        res.status(401).json({ message: "Unauthorized access" });
    }
}   catch{
         res.status(401).json({
            message: "Unauthorized access"
        });
        return ;
    }
}



