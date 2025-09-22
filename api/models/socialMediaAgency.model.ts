import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialMediaAgency extends Document {
  userId: string;
  name: string;
  logoId?: string;
  website?: string;
  slug?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedIn?: string;
  youtube?: string;
  tiktok?: string;
  otherSocialMedia?: string;
  shortDescription: string;
  description: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const SocialMediaAgencySchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logoId: { type: String },
  website: { type: String },
  slug: { type: String },
  facebook: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedIn: { type: String },
  youtube: { type: String },
  tiktok: { type: String },
  otherSocialMedia: { type: String },
  shortDescription: { type: String, required: true },
  description: { type: String, required: true },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date },
});

export default mongoose.model<ISocialMediaAgency>('SocialMediaAgency', SocialMediaAgencySchema);
