import mongoose, { Schema, Document } from 'mongoose';

export interface IComments extends Document {
  content: string;
  organizationId: string;
  postId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const CommentsSchema: Schema = new Schema({
  content: { type: String, required: true },
  organizationId: { type: String, required: true },
  postId: { type: String, required: true },
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<IComments>('Comments', CommentsSchema);
