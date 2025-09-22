import mongoose, { Schema, Document } from 'mongoose';

export interface ISets extends Document {
  organizationId: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const SetsSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISets>('Sets', SetsSchema);
