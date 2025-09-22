import mongoose, { Schema, Document } from 'mongoose';

export enum From {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
}

export interface IMessages extends Document {
  from: From;
  content?: string;
  groupId: string;
  special?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const MessagesSchema: Schema = new Schema({
  from: { type: String, enum: Object.values(From), required: true },
  content: { type: String },
  groupId: { type: String, required: true },
  special: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<IMessages>('Messages', MessagesSchema);
