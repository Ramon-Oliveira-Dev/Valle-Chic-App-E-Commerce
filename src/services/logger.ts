import { supabase } from '../lib/supabase';

export enum LogLevel {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  stack?: string;
  context?: any;
  userId?: string;
}

export const logger = {
  async log({ level, message, stack, context, userId }: LogEntry) {
    try {
      const { error } = await supabase
        .from('logs')
        .insert({
          level,
          message,
          stack,
          context: context || {},
          user_id: userId,
        });

      if (error) {
        console.error('Failed to send log to Supabase:', error);
      }
    } catch (err) {
      console.error('Error in logger service:', err);
    }
  },

  async error(message: string, error?: any, context?: any) {
    console.error(message, error);
    
    // Get current user if possible
    const { data: { user } } = await supabase.auth.getUser();

    await this.log({
      level: LogLevel.ERROR,
      message,
      stack: error instanceof Error ? error.stack : JSON.stringify(error),
      context,
      userId: user?.id,
    });
  },

  async info(message: string, context?: any) {
    console.log(message, context);
    await this.log({
      level: LogLevel.INFO,
      message,
      context,
    });
  },
};
