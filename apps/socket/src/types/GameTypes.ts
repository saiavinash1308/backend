import { CricketGame } from "../manager/game/CricketGame";
import { FastLudoGame } from "../manager/game/FastLudoGame";
import { LudoGame } from "../manager/game/LudoGame";
import { MemoryGame } from "../manager/game/MemoryGame";
import { RummyGame } from "../manager/game/RummyGame";

export type GameType = LudoGame | FastLudoGame | CricketGame | RummyGame | MemoryGame 