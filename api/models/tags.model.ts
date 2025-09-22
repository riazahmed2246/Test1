import mongoose, { Schema, Document } from 'mongoose';

export interface ITags extends Document {
  name: string;
  color: string;
  orgId: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TagsSchema: Schema = new Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  orgId: { type: String, required: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITags>('Tags', TagsSchema);
