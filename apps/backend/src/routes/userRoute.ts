import express from 'express';
import jwt from 'jsonwebtoken';
import {prisma} from '../lib/auth'
import { validateUser } from '../zod/validateAdmin';
import { verifyAdmin } from '../middlewares/verifyUser';
import { authenticateToken, UserRequest } from '../middlewares/verifyUser';

const router = express.Router();

const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}
router.post('/create', async(req, res) => {
    try {
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }
        const {name, mobile} = userValidate.data;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(user){
            return res.status(400).json({message: 'User already exists'})
        }
        const otp = generateOtp()
        await prisma.$transaction(async(tx) => {
            user = await tx.user.create({
                data: {
                    username: name,
                    mobile,
                    otp
                }
            });
            await tx.wallet.create({
                data: {
                    userId: user.userId
                }
            })
        })
        
        return res.status(200).json({message: 'OTP generated. Please verify.'})        
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
});

router.post('/login', async(req, res) => {
    try {
        const {mobile} = req.body;
        let user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'Mobile number not registered'})
        }
        if(user.suspended){
            return res.status(403).json({message: "User suspended"})
        }
        const otp = generateOtp()
        user = await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });
        

        return res.status(200).json({message: "OTP sent"})
    } catch (error) {
        return res.status(500).json({message: 'Some error occured', error})
    }
})

interface JwtPayload {
    userId: string; // Add any other fields present in your token payload
}

router.post('/update', authenticateToken ,async(req: UserRequest, res) => {
    try {
        const authUser = req.user
        if(!authUser){
            return res.status(401).json({message: 'Unauthorized'})
        }
        const {userId} = authUser
        const userValidate = validateUser.safeParse(req.body);
        if(!userValidate.success){
            return res.status(400).json({message: 'Invalid credentials'})
        }

        const {username} = req.body;
        

        let user = await prisma.user.findUnique({
            where: {
                userId
            }
        })
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const previousName = user.username
        const previousMobile = user.mobile
        user = await prisma.user.update({
            where: {
                userId
            },
            data: {
                username: username || previousName
            }
        });
        return res.status(200).json({message: 'User updated successfully', user})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.post('/verifyotp', async(req, res) => {
    try {
        const {otp, mobile} = req.body;
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        if(otp !== user.otp){
            return res.status(400).json({message: 'Incorrect OTP'})
        }
        const token = jwt.sign( { mobile: user.mobile, userId: user.userId, username: user.username }, 
            process.env.JWT_SECRET || "secret", 
        );
        return res.status(200).json({token, message: 'Login successful'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error', error})
    }
})

router.put('/resendotp', async(req, res) => {
    try {
        const {mobile} = req.body
        const user = await prisma.user.findUnique({
            where: {
                mobile
            }
        });
        if(!user){
            return res.status(400).json({message: 'User not found'})
        }
        const otp = generateOtp();
        await prisma.user.update({
            where: {
                mobile
            },
            data: {
                otp
            }
        });
        fetch(`https://test.troposcore.com/twilio`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mobile,
                otp
            })
        })
        return res.status(200).json({message: 'OTP updated'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.put('/suspend/:userId', verifyAdmin, async(req, res) => {
    try {
        const userId = req.params.userId;
        if(!userId){
            return res.status(400).json({message: 'Invalid user'})
        }
        await prisma.user.update({
            where: {
                userId
            },
            data: {
                suspended: true
            }
        });
        return res.status(200).json({message: 'User suspended successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

router.get('/leaderboard', async(req, res) => {
    try {
        const leaderboard = await prisma.user.findMany({
            orderBy: {
                winnings: {
                    _count: 'desc', // Order by count of winnings in descending order
                },
            },
            take: 20, // Fetch only the first 20 users
            select: {
                userId: true,
                username: true,
                _count: {
                    select: {
                        winnings: true,
                        rooms: true
                    }
                },
            },
        });
        
        return res.status(200).json({leaderboard})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.get('/profile', authenticateToken, async(req: UserRequest, res) => {
    try {
        const {userId} = req.user!;
        const user = await prisma.user.findUnique({
            where: {
                userId
            },
            select: {
                username: true,
                mobile: true,
                _count: {
                    select: {
                        winnings: true,
                        rooms: true
                    }
                }
            }
        });
        if(!user) return res.status(400).json({message: 'User not found'})
        return res.status(200).json({user: {username: user.username, mobile: user.mobile, totalMatches: user._count.rooms, matchesWon: user._count.winnings}})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

export default router;