import mongoose, { Schema, Document } from 'mongoose';

export interface IAutoPost extends Document {
  organizationId: string;
  title: string;
  content?: string;
  onSlot: boolean;
  syncLast: boolean;
  url: string;
  lastUrl: string;
  active: boolean;
  addPicture: boolean;
  generateContent: boolean;
  integrations: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AutoPostSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String },
  onSlot: { type: Boolean, required: true },
  syncLast: { type: Boolean, required: true },
  url: { type: String, required: true },
  lastUrl: { type: String, required: true },
  active: { type: Boolean, required: true },
  addPicture: { type: Boolean, required: true },
  generateContent: { type: Boolean, required: true },
  integrations: { type: String, required: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IAutoPost>('AutoPost', AutoPostSchema);
