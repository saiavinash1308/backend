import express from 'express'
import {prisma} from '../lib/auth'
import { verifyAdmin } from '../middlewares/verifyUser';
import { validateGameDetails } from '../zod/validateAdmin';
import { validateUser } from '../zod/validateAdmin';
import { authenticateToken } from '../middlewares/verifyUser';

const router = express();


router.post('/create', async(req, res) => {
    try {
        const isValidGame = validateGameDetails.safeParse(req.body);
        if(!isValidGame.success){
            return res.status(400).json({message: "Invalid game details"})
        }
        const {gameType, maxPlayers, entryFee, prizePool} = isValidGame.data
        const game = await prisma.game.create({
            data: {
                gameType,
                maxPlayers,
                entryFee,
                prizePool
            },
            select: {
                gameId: true
            }
        });
        return res.status(200).json({message: 'Game created successfully', gameId: game.gameId})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

// router.get('/fetchActiveGames',  authenticateToken, async(req, res) => {
//     try {
//         const games = await prisma.game.findMany({
//             where: {
//                 isActive: true
//             }
//         });
//         return res.status(200).json({games})
//     } catch (error) {
//         return res.status(500).json({message: 'Internal server error'})
//     }
// });

router.get('/fetchAllGames', verifyAdmin, async(req, res) => {
    try {
        const games = await prisma.game.findMany({});
        return res.status(200).json({games})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});

router.put('/enableGame/:gameId', async (req, res) => {
    try {
        const gameId = req.params.gameId;
    if(!gameId) return res.status(400).json({message: 'Invalid game id'});
    const game = await prisma.game.findUnique({
        where: {
            gameId
        }
    });
    if(!game){
        return res.status(400).json({message: 'Game not found'});
    }
    if(game.isActive){
        return res.status(400).json({message: 'Game is already active'});
    }
    await prisma.game.update({
        where: {
            gameId
        },
        data: {
            isActive: true
        }
    });
    return res.status(200).json({message: 'Game enabled successfully'});
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'});
    }
})

router.put('/disableGame/:gameId', verifyAdmin, async(req, res) => {
    try {
        const gameId = req.params.gameId;
        if(!gameId) return res.status(400).json({message: 'Invalid game id'});
        const game = await prisma.game.findUnique({
            where: {
                gameId
            }
        });
        if(!game) return res.status(400).json({message: 'Game not found'});
        if(!game.isActive){
            return res.status(400).json({message: 'Game is already inactive'});
        }
        await prisma.game.update({
            where: {
                gameId
            },
            data: {
                isActive: false
            }
        })

        return res.status(200).json({message: 'Game disabled successfully'})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
})

type gameJwtClaims = "LUDO" | "CRICKET" | "FAST_LUDO" | "RUMMY" | "MEMORYGAME"

router.get('/fetchGame/:gameType', async(req, res) => {
    try {
        console.log('Hit fetchgame');
        const gameType = req.params.gameType as gameJwtClaims;
        const games = await prisma.game.findMany({
            where: {
                gameType,
                isActive: true
            }
        });
        console.log(games);
        return res.status(200).json({games})
    } catch (error) {
        return res.status(500).json({message: 'Internal server error'})
    }
});




export default router;

