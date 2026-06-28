export type NoticeType = "clipboard" | "email" | "generic";

export interface NoticeItem {
  id: string;
  uuid?: string;
  type: NoticeType;
  message: string;
  duration: number;
  payload: unknown;
  timestamp: number;
}

export interface ClipboardPayload {
  urls: string[];
  downloadable: boolean;
}
