export interface UploadTicket {
  method: 'PUT';
  /** Where the browser sends the file. */
  url: string;
  headers: Record<string, string>;
  key: string;
}

export interface StorageProvider {
  readonly id: 'local' | 'r2';
  createUpload(input: {
    key: string;
    bucket: 'public' | 'private';
    contentType: string;
    maxBytes: number;
  }): Promise<UploadTicket>;
  /** URL of a public object. Private objects are only served through permission checks. */
  publicUrl(key: string): string;
}
