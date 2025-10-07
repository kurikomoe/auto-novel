export const MessagePingType = 'AUTO_NOVEL_CRAWLER_PING';
export const MessageRequestType = 'AUTO_NOVEL_CRAWLER_REQUEST';
export const MessageResponseType = 'AUTO_NOVEL_CRAWLER_RESPONSE';

export interface MessagePing {
  type: typeof MessagePingType;
  id?: string;
}

export type RequestPayload = {
  base_url: string;
  single?: boolean; // auto call close() after command
  job_id?: string;
  cmd: string;
  params?: any;
};

export interface MessageRequest {
  type: typeof MessageRequestType;
  id?: string;
  payload: RequestPayload;
}

export interface MessageResponse {
  type: typeof MessageResponseType;
  id?: string;
  payload: ResponsePayload;
}

export type ResponsePayload = {
  success: boolean;
  result?: any;
  error?: string;
};

export type Message = MessagePing | MessageRequest | MessageResponse;
