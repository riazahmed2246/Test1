import mongoose, { Schema, Document } from 'mongoose';

export interface IThirdParty extends Document {
  organizationId: string;
  identifier: string;
  name: string;
  internalId: string;
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const ThirdPartySchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  identifier: { type: String, required: true },
  name: { type: String, required: true },
  internalId: { type: String, required: true },
  apiKey: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<IThirdParty>('ThirdParty', ThirdPartySchema);
