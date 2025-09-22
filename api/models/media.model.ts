import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  name: string;
  path: string;
  organizationId: string;
  thumbnail?: string;
  thumbnailTimestamp?: number;
  alt?: string;
  fileSize: number;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const MediaSchema: Schema = new Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  organizationId: { type: String, required: true },
  thumbnail: { type: String },
  thumbnailTimestamp: { type: Number },
  alt: { type: String },
  fileSize: { type: Number, default: 0 },
  type: { type: String, default: 'image' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<IMedia>('Media', MediaSchema);
