import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelRequest extends IncomingMessage {
  body?: any;
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
}

export interface VercelResponse extends ServerResponse {
  status: (code: number) => this;
  json: (data: any) => this;
  send: (data: any) => this;
}
