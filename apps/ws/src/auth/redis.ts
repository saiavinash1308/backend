import Redis from 'ioredis'
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

const redis = new Redis(`${process.env.REDIS_URL}`);

export class RateLimiter {
    private static instance: RateLimiter
    private readonly rateLimiters: Record<string, RateLimiterRedis>
    constructor(){
        this.rateLimiters = {
            'roll-dice': new RateLimiterRedis({
                storeClient: redis,
                points: 1,
                duration: 5
            }),
            'make-move': new RateLimiterRedis({
                storeClient: redis,
                points: 1,
                duration: 3
            })
        }
    }
    public static getInstance(){
        if(!RateLimiter.instance){
            RateLimiter.instance = new RateLimiter();
        }
        return RateLimiter.instance;
    }

    private async isAllowed(limiter: RateLimiterRedis, key: string): Promise<boolean> {
        try {
            const result = await limiter.consume(key); // Try to consume a point
            return result.remainingPoints > 0;
        } catch (err) {
            // Cast err to RateLimiterRes if it's a rate-limiting error
            if ((err as RateLimiterRes).msBeforeNext !== undefined) {
                // Blocked due to rate limiting
                return false;
            }
            throw err; // Throw unexpected errors
        }
    }

    public async hasRollLimit(socketId: string){
        const limiter = this.rateLimiters['roll-dice'];
        const key = `roll-dice-${socketId}`;
        return await this.isAllowed(limiter, key);
    }

    public async hasMakeMoveLimit(socketId: string){
        const limiter = this.rateLimiters['make-move'];
        const key = `make-move-${socketId}`;
        return await this.isAllowed(limiter, key);
    }
}

const rateLimiter = RateLimiter.getInstance();
Object.freeze(rateLimiter);

export default rateLimiter;