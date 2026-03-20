import { isJsonMode } from '../index.js';

// Output data in appropriate format based on mode
export const output = {
  // Success response
  success: (data: unknown, message?: string) => {
    if (isJsonMode) {
      console.log(JSON.stringify({
        success: true,
        data,
        message,
      }));
    }
    // In interactive mode, let the command handle its own output
  },

  // Error response
  error: (message: string, code?: string) => {
    if (isJsonMode) {
      console.log(JSON.stringify({
        success: false,
        error: message,
        code,
      }));
    } else {
      console.error(message);
    }
  },

  // Raw JSON output (for Agent parsing)
  json: (data: unknown) => {
    console.log(JSON.stringify(data));
  },

  // Table output - in JSON mode, output as array
  table: (data: unknown[]) => {
    if (isJsonMode) {
      console.log(JSON.stringify({
        success: true,
        data,
        count: data.length,
      }));
    }
    // In interactive mode, let the command handle its own output
  },

  // List output
  list: (items: unknown[], title?: string) => {
    if (isJsonMode) {
      console.log(JSON.stringify({
        success: true,
        data: items,
        title,
        count: items.length,
      }));
    }
  },
};

// Helper to format API responses for CLI output
export const formatApiResponse = <T>(response: { success: boolean; data?: T; message?: string; error?: string }) => {
  if (isJsonMode) {
    console.log(JSON.stringify(response));
    return;
  }
  // In interactive mode, return the response for the command to handle
  return response;
};
