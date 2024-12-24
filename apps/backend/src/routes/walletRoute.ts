import express, {Request} from 'express'
import { verifyAdmin } from '../middlewares/verifyUser';
import {prisma} from '../lib/auth'
import { authenticateToken, UserRequest } from '../middlewares/verifyUser';


const router = express.Router();


router.post('/getallwallets', verifyAdmin, async(req, res) => {
    try {
        const wallets = await prisma.wallet.findMany({});
        return res.status(200).json({wallets})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

interface JwtPayload {
    userId: string; // Add any other fields present in your token payload
}

router.post('/getwallet', authenticateToken, async(req: Request & { user?: JwtPayload }, res) => {
    try {
        const {userId} = req.body;
        const wallet = await prisma.wallet.findFirst({
            where: {
                user: {
                    userId
                }
            }
        });
        if(!wallet){
            return res.status(400).json({message: 'Wallet not found'})
        }
        return res.status(200).json({wallet})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})
router.get('/getWalletAmount', authenticateToken, async(req: UserRequest, res) => {
    try {
        const {userId} = req.user!
        const wallet = await prisma.wallet.findFirst({
            where: {
                user: {
                    userId
                }
            },
            select: {
                currentBalance: true
            }
        });
        if(!wallet){
            return res.status(400).json({message: 'Wallet not found'})
        }
        return res.status(200).json({amount: wallet.currentBalance})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

export default router