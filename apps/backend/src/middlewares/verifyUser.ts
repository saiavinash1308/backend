import { NextFunction, Response, Request } from 'express';
import jwt from 'jsonwebtoken'

type UserToken = {
  userId: string
}

export type UserRequest = Request & {user?: UserToken}

export function authenticateToken(req: UserRequest, res: Response, next: NextFunction) {
  const token = req.headers['authorization'] // Assuming Bearer token format

  if (!token) {
    return res.status(401).send('Unauthorized token'); // Unauthorized
  }
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err: any, user: any) => {
    if (err) {
      return res.status(403).send('Forbidden error'); // Forbidden
    }
    req.user = user; // Save user information for use in the next middleware
    next(); // Proceed to the next middleware
  });
}
