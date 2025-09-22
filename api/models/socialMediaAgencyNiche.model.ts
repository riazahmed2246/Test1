import mongoose, { Schema, Document } from 'mongoose';

export interface ISocialMediaAgencyNiche extends Document {
  agencyId: string;
  niche: string;
}

const SocialMediaAgencyNicheSchema: Schema = new Schema({
  agencyId: { type: String, required: true },
  niche: { type: String, required: true },
});

export default mongoose.model<ISocialMediaAgencyNiche>('SocialMediaAgencyNiche', SocialMediaAgencyNicheSchema);
