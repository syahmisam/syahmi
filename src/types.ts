export type Program = 'Diploma' | 'Asasi';
export type CourseStatus = 'Aktif' | 'Arkib';

export interface Course {
  id?: string;
  code: string;
  name: string;
  program: Program;
  credits: number;
  status: CourseStatus;
  description?: string;
  createdAt: any;
  updatedAt: any;
  updatedBy: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
