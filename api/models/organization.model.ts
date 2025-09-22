import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  description?: string;
  apiKey?: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  allowTrial: boolean;
  isTrailing: boolean;
}

const OrganizationSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  apiKey: { type: String },
  paymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  allowTrial: { type: Boolean, default: false },
  isTrailing: { type: Boolean, default: false },
});

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
