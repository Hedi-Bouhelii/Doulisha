'use client';

/** Uploads a file with a presigned ticket from `uploads.create`; returns the object key. */
export async function putFile(
  ticket: { url: string; method: 'PUT'; headers: Record<string, string>; key: string },
  file: File,
): Promise<string> {
  const response = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: file });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
  return ticket.key;
}
