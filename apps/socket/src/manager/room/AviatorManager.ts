import { createId } from "@paralleldrive/cuid2";
import { UserExistsInRoomResponse } from "../../types/RoomManagerTypes";
import { AviatorGame } from "../game/AviatorGame";
import { appManager } from "../main/AppManager";
import { User } from "../users/User";
import { prisma } from "../../lib/client";

export interface Bid{
    userId: string,
    investedAmount: number,
    cashedOut: boolean,
    rate?: number
}

class AviatorManager{
    private static instance: AviatorManager;
    
    private game: AviatorGame;
    constructor(){
        const roomId = createId();
        this.game = new AviatorGame(roomId)
    }
    static getInstance(): AviatorManager{
            if(AviatorManager.instance){
                return AviatorManager.instance;
            }
            AviatorManager.instance = new AviatorManager();
            return AviatorManager.instance;
    }

    private checkUserExistsInRoom(socketId: string): UserExistsInRoomResponse{
        const checkUser = appManager.getUserToRoomMapping().get(socketId);
        if(checkUser) return true;
        return false
    }

    public addPlayer(user: User){
        const userId = user.getUserId();
        const status = this.checkUserExistsInRoom(userId);
        this.game.players.set(user.getUserId(), user)
        if(!status){
            if(this.game.isRunning){
                const data = this.game.getCurrentData();
                user.getSocket().emit("AVIATOR_RUNNING_GAME", data);
            }
            else{
                const data = this.game.getRemainingWaitingTime().toString()
                user.getSocket().emit("AVIATOR_WAITING", data);
            }
        }
    }

    public removePlayer(userId: string){
        this.game.players.delete(userId);
    }


    public addBid(user: User, amount: number){
        const userId = user.getUserId();
        if(this.game.isRunning) return;
        prisma.$transaction(async(tx) => {
            const wallet = await tx.wallet.findUnique({
                where: {
                    userId
                },
                select: {
                   currentBalance: true,
                   walletId: true
                }
            })
            if(!wallet) return
            if(wallet.currentBalance < amount) return
            await tx.wallet.update({
                where: {
                    walletId: wallet.walletId
                },
                data: {
                    currentBalance: {
                        decrement: amount
                    }
                }
            }).then(() => {
                const bid: Bid = {userId, investedAmount: amount, cashedOut: false}
                this.game.biddings.set(userId, bid)
                user.getSocket().emit("AVIATOR_BID_SUCCESS")
            })

        })
    }


    public cashOutBid(user: User){
        if(!this.game.isRunning) return;
        const rate = this.game.getCurrentRate();
        const bid = this.game.biddings.get(user.getUserId());
        if(!bid) return;
        bid.cashedOut = true;
        bid.rate = rate
        this.game.biddings.set(user.getUserId(), bid);
    }
}

export const aviatorManager = AviatorManager.getInstance();