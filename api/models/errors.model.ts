import mongoose, { Schema, Document } from 'mongoose';

export interface IErrors extends Document {
  message: string;
  body: string;
  platform: string;
  organizationId: string;
  postId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ErrorsSchema: Schema = new Schema({
  message: { type: String, required: true },
  body: { type: String, default: '{}' },
  platform: { type: String, required: true },
  organizationId: { type: String, required: true },
  postId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IErrors>('Errors', ErrorsSchema);
