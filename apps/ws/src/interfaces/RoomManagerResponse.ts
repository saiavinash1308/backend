import { DBGameType } from "../types/RoomTypes";

export interface AddToPendingRoomResponse{
    success: boolean
    message: string,
}

export interface GameDetailsResponse {
success: boolean
gameDetails?: {
    gameId: string;
    gameType: DBGameType;
    maxPlayers: number;
    entryFee: number;
    prizePool: number;
    currency: string;
    isActive: boolean;
}

}