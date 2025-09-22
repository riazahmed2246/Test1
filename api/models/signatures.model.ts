import mongoose, { Schema, Document } from 'mongoose';

export interface ISignatures extends Document {
  organizationId: string;
  content: string;
  autoAdd: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const SignaturesSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  content: { type: String, required: true },
  autoAdd: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<ISignatures>('Signatures', SignaturesSchema);
