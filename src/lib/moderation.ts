export interface WarnLog {
    date: Date;
    user: string;
    reason: string;
}

export interface TimeoutLog {
    date: Date;
    duration: string;
    user: string;
    reason: string;
}

export interface BanLog {
    date: Date;
    user: string;
    reason: string;
}

export interface ModerationLog {
    _id: {
        guild: string;
        user: string;
    };
    warnings?: [WarnLog];
    timeouts?: [TimeoutLog];
    bans?: [BanLog];
}