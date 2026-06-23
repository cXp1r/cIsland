export type PrivacyUsagePayload = {
  microphone: boolean;
  camera: boolean;
};
export type WeatherResult = {  desc: string;  temp: number;  city: string;};
export type ClipboardUrlsPayload = {
  urls: string[];
  downloadables: boolean[];
};

