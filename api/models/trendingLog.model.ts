import mongoose, { Schema, Document } from 'mongoose';

export interface ITrendingLog extends Document {
  language?: string;
  date: Date;
}

const TrendingLogSchema: Schema = new Schema({
  language: { type: String },
  date: { type: Date, required: true },
});

export default mongoose.model<ITrendingLog>('TrendingLog', TrendingLogSchema);
