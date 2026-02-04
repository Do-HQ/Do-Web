export interface CustomFile {
  ownerId: string;
  workspaceId?: string;
  publicId: string;
  url: string;
  resourceType: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  folder: string;
  _id: string;
}

export interface ResponseObject {
  message: string;
  description: string;
}
