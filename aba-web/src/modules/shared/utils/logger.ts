// This is a simple logger utility that formats logs as JSON with timestamps. 
// We must expand this to include log levels, file names, line numbers, etc., as needed.
// Todo: Consider implementing a backend endpoint to send the logs there for centralized logging and analysis.
export const logger = {
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(
      JSON.stringify({ msg, ...meta, timestamp: new Date().toISOString() }),
    );
  },
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.info(
      JSON.stringify({ msg, ...meta, timestamp: new Date().toISOString() }),
    );
  },
};