import { prisma } from "../../lib/client";
import { appManager } from "../main/AppManager";
import { Room } from "../room/Room";
import { socketManager } from "../socket/SocketManager";
import { gameManager } from "./GameManager";
import { randomInt } from 'crypto'

export class MemoryGame{
    private readonly roomId: string
        private readonly room: Room
        private player1: string;
        private player2: string;
        private currentPlayer: string;
        private card1: string | null = null;
        private card1Index: number = -1;
        private player1Score: number =  0;
        private player2Score: number =  0;
        private gameCards: string[];
        private isGameEnd: boolean = false;
        private isCardOpened: boolean = false;
        private user1: string;
        private user2: string
        constructor(roomId: string){
            this.roomId = roomId
            const room = appManager.getRooms().get(roomId);
            if(!room) throw new Error('Room not found');
            this.room = room;
            this.gameCards = this.shuffleCards();
            const players = room.getPlayers();
            this.player1 = players[0].socket.id;
            this.user1 = players[0].userId;

            this.player2 = players[1].socket.id;
            this.user2 = players[1].userId

            this.currentPlayer = this.player1;
            const newUsers = new Array<{socketId: string, username: string}>();
            this.room.getPlayers().forEach((player) => newUsers.push({socketId: player.socket.id, username: player.username}))
            const message = JSON.stringify({roomId, users: newUsers})
            socketManager.broadcastToRoom(roomId, "STOP_SEARCH", 'Stop Searching');
            socketManager.broadcastToRoom(roomId, "START_MEMORY_GAME", message);
            setTimeout(() => {
                socketManager.broadcastToRoom(roomId, "MEMORY_GAME_CURRENT_TURN", this.currentPlayer)
            }, 1000);
        }

        private shuffleCards() {
            const iconConfigs = [
                "Mind_0", "Mind_1", "Mind_2", "Mind_3", "Mind_4",
                "Mind_5", "Mind_6", "Mind_7", "Mind_8", "Mind_9", "Mind_10"
            ];
        
            const duplicatedArray = [...iconConfigs, ...iconConfigs];
            const n = duplicatedArray.length;
        
            for (let i = n - 1; i > 0; i--) {
                const j = randomInt(0, i + 1); // secure random int between 0 and i
                [duplicatedArray[i], duplicatedArray[j]] = [duplicatedArray[j], duplicatedArray[i]];
            }
        
            return duplicatedArray;
        }



        public handleTurn(playerId: string){
            console.log("Expected Turn change from " + this.currentPlayer + " recieved " + playerId);
            if(!this.isValidTurn(playerId)) return;
            if(this.currentPlayer === this.player1){
                this.currentPlayer = this.player2
            }
            else{
                this.currentPlayer = this.player1
            }
            setTimeout(() => {
                socketManager.broadcastToRoom(this.roomId, "MEMORY_GAME_CURRENT_TURN", this.currentPlayer)
            }, 500);
            
        }

        private isValidTurn(playerId: string){
            return this.currentPlayer === playerId;
        }

        public getRoomId(){
            return this.roomId;
        }
        

        public pickCard(playerId: string, index: number){
            console.log("Expected pick from " + this.currentPlayer + " expected " + playerId )
            if(!this.isValidTurn(playerId)) return;
            if(index < 0 || index > 21) {
                console.log("Index out of range");
                return;
            };
            if(this.isCardOpened) {
                console.log("Card open status: " + this.isCardOpened);
                return;
            };
            this.isCardOpened = true;
            const currentCard = this.gameCards[index];
            const message = JSON.stringify({card: currentCard, index})
            socketManager.broadcastToRoom(this.roomId, "OPEN_CARD", message);
            this.isCardOpened = false
            if(!this.card1) {
                this.card1 = currentCard
                this.card1Index = index
                return
            }
            if(this.card1Index === index) return;
            if((this.card1 === currentCard)){
                    this.currentPlayer === this.player1 ? this.player1Score++  : this.player2Score++
                    //TODO: update score with same current turn and remove cards
                    console.log("Player1 score: " + this.player1Score + " Player2Score: " + this.player2Score)
                    setTimeout(() => {
                        if(this.player1Score + this.player2Score < 11){
                            const message = JSON.stringify({playerId: this.currentPlayer, index1: this.card1Index, index2: index, score1: this.player1Score, score2: this.player2Score})
                            socketManager.broadcastToRoom(this.roomId, "CARDS_MATCHED", message);
                            this.card1Index = -1
                            this.card1 = null
                        }
                        else{
                            const winnerId = this.player1Score > this.player2Score ? this.player1 : this.player2;
                            const winner = this.player1Score > this.player2Score ? this.user1 : this.user2;
                            const message = JSON.stringify({winnerId, score1: this.player1Score, score2: this.player2Score})
                            socketManager.broadcastToRoom(this.roomId, "END_GAME", message);
                            this.writeToDB(winner)
                            gameManager.deleteGame(this.roomId)
                        }
                    }, 1500);
            }
            else{
                setTimeout(() => {
                    const message = JSON.stringify({index1: this.card1Index, index2: index})
                    setTimeout(() => {
                        console.log("Close cards")
                        socketManager.broadcastToRoom(this.roomId, "CLOSE_CARDS", message)
                        this.card1Index = -1
                        this.card1 = null
                    }, 1000);
                }, 1000);
                
            }
            
        }

        private async writeToDB(userId: string){
            const winAmount = this.room.prizePool;
            const wallet = await prisma.wallet.findUnique({
                where: {
                    userId
                },
                select: {
                    walletId: true
                }
            });

            if(!wallet) return;

            await prisma.wallet.update({
                where: {
                    walletId: wallet.walletId
                },
                data: {
                    currentBalance: {
                        increment: winAmount
                    }
                }
            })

        }


        public async exitGame(playerId: string){

            
            if(playerId === this.player1){
                await this.writeToDB(this.user2)
                const message = JSON.stringify({winnerId: this.player2, score1: this.player1Score, score2: this.player2Score})
                socketManager.emitToOthers(this.roomId, "END_GAME", message, this.player1)
            }
            else{
                await this.writeToDB(this.user1)
                const message = JSON.stringify({winnerId: this.player1, score1: this.player1Score, score2: this.player2Score})
                socketManager.emitToOthers(this.roomId, "END_GAME", message, this.player2)
            }

            gameManager.deleteGame(this.roomId)
        }




}