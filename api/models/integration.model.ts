import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  internalId: string;
  organizationId: string;
  name: string;
  picture?: string;
  providerIdentifier: string;
  type: string;
  token: string;
  disabled: boolean;
  tokenExpiration?: Date;
  profile?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  inBetweenSteps: boolean;
  refreshNeeded: boolean;
  postingTimes: string;
  customInstanceDetails?: string;
  customerId?: string;
  rootInternalId?: string;
  additionalSettings?: string;

}

const IntegrationSchema: Schema = new Schema({
  internalId: { type: String, required: true },
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  picture: { type: String },
  providerIdentifier: { type: String, required: true },
  type: { type: String, required: true },
  token: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  tokenExpiration: { type: Date },
  profile: { type: String },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  inBetweenSteps: { type: Boolean, default: false },
  refreshNeeded: { type: Boolean, default: false },
  postingTimes: { type: String, default: '[{"time":120}, {"time":400}, {"time":700}]' },
  customInstanceDetails: { type: String },
  customerId: { type: String },
  rootInternalId: { type: String },
  additionalSettings: { type: String, default: '[]' },
});

export default mongoose.model<IIntegration>('Integration', IntegrationSchema);
