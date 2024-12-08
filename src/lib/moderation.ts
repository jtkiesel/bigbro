export interface warnLog {
    date: Date;
    user: string;
    reason: string;
}

export interface timeoutLog {
    date: Date;
    duration: string;
    user: string;
    reason: string;
}

export interface banLog {
    date: Date;
    user: string;
    reason: string;
}

export interface ModerationLog {
    _id: {
        guild: string;
        user: string;
    };
    warnings?: [warnLog];
    timeouts?: [timeoutLog];
    bans?: [banLog];
}