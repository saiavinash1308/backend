import { RateLimiterMemory } from 'rate-limiter-flexible';

const rollLimiter = new RateLimiterMemory({
  points: 1, // 1 request
  duration: 2, // per 2 seconds
});

const moveLimter = new RateLimiterMemory({
    points: 1, // 1 request
    duration: 2, // per 2 seconds
})

const playerFinishedLimit = new RateLimiterMemory({
    points: 1, // 1 request
    duration: 2, // per 2 seconds
})

const switchPlayerLimit = new RateLimiterMemory({
    points: 1, // 1 request
    duration: 2, // per 2 seconds
})

const avoidSwitchPlayerLimit = new RateLimiterMemory({
    points: 1, // 1 request
    duration: 2, // per 2 seconds
})

const pickCardLimit = new RateLimiterMemory({
    points: 1, // 1 request
    duration: 1, // per 0.5 seconds
})





class RateLimiter{
    private static instance: RateLimiter;
    public static getInstance(): RateLimiter {
        if(RateLimiter.instance){
            return RateLimiter.instance;
        }
        RateLimiter.instance = new RateLimiter();
        return RateLimiter.instance;
    }

    public async hasRollLimit(id: string): Promise<boolean> {
        try {
            await rollLimiter.consume(id);
            return true;
        } catch {
            return false;
        }
    }

    public async hasMoveLimit(id: string): Promise<boolean> {
        try {
            await moveLimter.consume(id);
            return true;
        } catch {
            return false;
        }
    }

    public async hasPlayerFinishedMovingLimit(id: string): Promise<boolean> {
        try {
            await playerFinishedLimit.consume(id);
            return true;
        } catch {
            return false;
        }
    }

    public async hasSwitchPlayerLimit(id: string): Promise<boolean> {
        try {
            await switchPlayerLimit.consume(id);
            return true;
        } catch {
            return false;
        }
    }

    public async hasAvoidSwitchPlayerLimit(id: string): Promise<boolean> {
        try {
            await avoidSwitchPlayerLimit.consume(id);
            return true;
        } catch {
            return false;
        }
    }

    public async hasPickLimit(id: string){
        try {
            await pickCardLimit.consume(id);
            return true
        } catch (error) {
            return false
        }
    }

}


export const limitManager = RateLimiter.getInstance()