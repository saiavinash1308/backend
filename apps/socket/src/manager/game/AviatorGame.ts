import { createId } from "@paralleldrive/cuid2";
import { Bid } from "../room/AviatorManager";
import { User } from "../users/User";
import crypto from 'crypto'
import { prisma } from "../../lib/client";

const AES_KEY = Buffer.from(process.env.AES_KEY!, 'hex');
const AES_IV = Buffer.from(process.env.AES_IV!, 'hex');
const SERVER_SECRET = process.env.SERVER_SECRET!

interface WinRecord {
    userId: string,
    amount: number
}

export class AviatorGame{
    private _roomId: string;
    private _isRunning: boolean = false;
    private _waitingTime = 10000; // 10 seconds
    private _players: Map<string, User> = new Map();
    private _biddings: Map<string, Bid> = new Map();
    private _rate: number = 1.00
    private _startTime: number | null = null;
    private _maxRate: number;
    private _interval: NodeJS.Timeout | null = null;
    constructor(roomId: string){
        this._roomId = roomId
        this._maxRate = 5.36;
        this.initializeGame()
    }

    private initializeGame(){
        const data = this._waitingTime.toString();
        this._rate = 1.00
        for(const user of this.players.values()){
            user.getSocket().emit("AVIATOR_WAITING", data)
        }
        this._startTime = performance.now()
        setTimeout(() => {
            // const maxRate = (Math.random() * (100.00 - 1.01) + 1.01).toFixed(2);
            const rateString = this._maxRate.toString()
            const encryptedRate = this.encryptAES(rateString);
            const serverHash = this.generateHMAC(rateString); 
            this._isRunning = true;
            for(const user of this.players.values()){
                const bid = this.biddings.get(user.getUserId())
                const message = JSON.stringify({seed: encryptedRate, hash: serverHash, player: !!bid})
                user.getSocket().emit("START_AVIATOR", message)
            }
            this.startGame()
        }, this._waitingTime);
    }

    public getRoomId(){
        return this._roomId;
    }

    private startGame() {
        if (this._interval) return; // Prevent multiple intervals
    
        this._interval = setInterval(() => {
            console.log(this._rate);
            if (this._rate >= this._maxRate) {
                console.log("max rate reached" + this._rate)
                clearInterval(this._interval!);
                this._interval = null; // Reset interval
                this.endGame()
                return;
            }
            this._rate = parseFloat((this._rate + 0.01).toFixed(2)); // Increment & fix decimal places
        }, 100);
    }

    public get isRunning(){
        return this._isRunning
    }

    public getCurrentData(){
        return JSON.stringify({currentRate: this.encryptAES(this._rate.toString()), maxRate: this.encryptAES(this._maxRate.toString())})
    }

    public getRemainingWaitingTime(){
        if (this._startTime === null) {
            return this._waitingTime; 
        }
    
        const elapsedTime = performance.now() - this._startTime;
        return Math.max(0, this._waitingTime - elapsedTime);
    }

    public getCurrentRate(){
        return this._rate
    }

    public get biddings(){
        return this._biddings
    }

    public get players(){
        return this._players
    }

    private encryptAES(text: string) {
        let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(AES_KEY), Buffer.from(AES_IV));
        let encrypted = cipher.update(text, "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
    }
    
    private decryptAES(encryptedText: string) {
        let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(AES_KEY), Buffer.from(AES_IV));
        let decrypted = decipher.update(encryptedText, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    
    private generateHMAC(data: string) {
        return crypto.createHmac("sha256", SERVER_SECRET).update(data).digest("hex");
    }


    private endGame(){
        const winners: WinRecord[] = []
        for(const user of this.players.values()){
            const bid = this._biddings.get(user.getUserId());
            if(bid && bid.cashedOut){
                const rate = bid.rate as number
                const data: WinRecord =  {userId: user.getUserId(), amount: bid.investedAmount * rate}
                winners.push(data)
            }
        }
        //store winners data to db.
        winners.forEach(async(winner) => {
            try {
                await prisma.$transaction(async(tx) => {
                    await tx.wallet.update({
                        where: {
                            userId: winner.userId
                        },
                        data: {
                            currentBalance: {
                                increment: winner.amount
                            }
                        }
                    })
                })
            } catch (error) {
                console.log("Winner wallet not found");
            }
        });
        this._biddings = new Map();
        this._roomId = createId();
        this.initializeGame();
    }
}
