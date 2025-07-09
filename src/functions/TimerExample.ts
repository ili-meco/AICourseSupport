import { app, InvocationContext, Timer } from "@azure/functions";

export async function TimerExample(myTimer: Timer, context: InvocationContext): Promise<void> {
    const timestamp = new Date().toISOString();
    
    if (myTimer.isPastDue) {
        context.log('Timer function is running late!');
    }
    
    context.log(`Timer function executed at: ${timestamp}`);
    
    // Add your timer-based logic here
    // For example: cleanup tasks, data processing, sending notifications, etc.
    
    const nextRun = myTimer.scheduleStatus?.next;
    if (nextRun) {
        context.log(`Next timer trigger: ${nextRun}`);
    }
}

app.timer('TimerExample', {
    schedule: '0 */5 * * * *',
    handler: TimerExample
});
