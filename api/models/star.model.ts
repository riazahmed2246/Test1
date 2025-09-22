import mongoose, { Schema, Document } from 'mongoose';

export interface IStar extends Document {
  stars: number;
  totalStars: number;
  forks: number;
  totalForks: number;
  login: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StarSchema: Schema = new Schema({
  stars: { type: Number, required: true },
  totalStars: { type: Number, required: true },
  forks: { type: Number, required: true },
  totalForks: { type: Number, required: true },
  login: { type: String, required: true },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IStar>('Star', StarSchema);
