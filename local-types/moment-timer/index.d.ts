import moment from 'moment';

export = moment;

declare module 'moment' {
  interface TimerAttributes {
    /** Setting this attribute to `true` will cause the timer to start once instantiated. */
    start?: boolean;
    /** Setting this attribute to `true` will cause the timer to loop/reset once a duration is complete. */
    loop?: boolean;
    /** Setting this attribute will cause the time to wait for a specified amount of time before starting its duration. */
    wait?: number | Duration;
    /** Setting this attribute to `true` will cause the callback to be called after the wait duration has ended. */
    executeAfterWait?: boolean;
  }

  interface Timer {
    /** Start the timer. This can be used if the start attribute has not been set or if the timer has been stopped. */
    start(): boolean;
    /** Stop the timer. */
    stop(): boolean;

    /** Change the timer's duration. */
    duration(duration: number | Duration): boolean;
    /** Get the current duration of the timer. */
    getDuration(): Duration;
    /** Get the remaining duration of the timer's cycle. */
    getRemainingDuration(): Duration;

    /** Check whether the timer is stopped. */
    isStopped(): boolean;
    /** Check whether the timer is running. */
    isStarted(): boolean;
  }

  interface Duration {
    timer(attributes: TimerAttributes, callback: Function): Timer;
  }
}
