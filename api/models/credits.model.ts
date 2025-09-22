import mongoose, { Schema, Document } from 'mongoose';

export interface ICredits extends Document {
  organizationId: string;
  credits: number;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

const CreditsSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  credits: { type: Number, required: true },
  type: { type: String, default: 'ai_images' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ICredits>('Credits', CreditsSchema);
