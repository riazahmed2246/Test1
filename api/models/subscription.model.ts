import mongoose, { Schema, Document } from 'mongoose';

export enum SubscriptionTier {
  STANDARD = 'STANDARD',
  PRO = 'PRO',
  TEAM = 'TEAM',
  ULTIMATE = 'ULTIMATE',
}
export enum Period {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface ISubscription extends Document {
  organizationId: string;
  subscriptionTier: SubscriptionTier;
  identifier?: string;
  cancelAt?: Date;
  period: Period;
  totalChannels: number;
  isLifetime: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const SubscriptionSchema: Schema = new Schema({
  organizationId: { type: String, required: true, unique: true },
  subscriptionTier: { type: String, enum: Object.values(SubscriptionTier), required: true },
  identifier: { type: String },
  cancelAt: { type: Date },
  period: { type: String, enum: Object.values(Period), required: true },
  totalChannels: { type: Number, required: true },
  isLifetime: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
