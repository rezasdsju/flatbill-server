import { ObjectId } from "mongodb";

export interface TenantRecord {
  _id: string | ObjectId;
  name?: string | null;
  email?: string;
  phone?: string | null;
  moveInDate?: string;
  moveOutDate?: string;
  [key: string]: unknown;
}