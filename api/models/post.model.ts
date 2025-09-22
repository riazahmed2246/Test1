import mongoose, { Schema, Document } from 'mongoose';

export enum State {
  QUEUE = 'QUEUE',
  PUBLISHED = 'PUBLISHED',
  ERROR = 'ERROR',
  DRAFT = 'DRAFT',
}
export enum APPROVED_SUBMIT_FOR_ORDER {
  NO = 'NO',
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  YES = 'YES',
}

export interface IPost extends Document {
  state: State;
  publishDate: Date;
  organizationId: string;
  integrationId: string;
  content: string;
  group: string;
  title?: string;
  description?: string;
  parentPostId?: string;
  releaseId?: string;
  releaseURL?: string;
  settings?: string;
  image?: string;
  submittedForOrderId?: string;
  submittedForOrganizationId?: string;
  approvedSubmitForOrder: APPROVED_SUBMIT_FOR_ORDER;
  intervalInDays?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const PostSchema: Schema = new Schema({
  state: { type: String, enum: Object.values(State), default: State.QUEUE },
  publishDate: { type: Date, required: true },
  organizationId: { type: String, required: true },
  integrationId: { type: String, required: true },
  content: { type: String, required: true },
  group: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  parentPostId: { type: String },
  releaseId: { type: String },
  releaseURL: { type: String },
  settings: { type: String },
  image: { type: String },
  submittedForOrderId: { type: String },
  submittedForOrganizationId: { type: String },
  approvedSubmitForOrder: { type: String, enum: Object.values(APPROVED_SUBMIT_FOR_ORDER), default: APPROVED_SUBMIT_FOR_ORDER.NO },
  intervalInDays: { type: Number },
  error: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<IPost>('Post', PostSchema);
