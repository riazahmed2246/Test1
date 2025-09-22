import mongoose, { Schema, Document } from 'mongoose';

export interface ITrending extends Document {
  trendingList: string;
  language?: string;
  hash: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TrendingSchema: Schema = new Schema({
  trendingList: { type: String, required: true },
  language: { type: String },
  hash: { type: String, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITrending>('Trending', TrendingSchema);
