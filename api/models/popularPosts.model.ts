import mongoose, { Schema, Document } from 'mongoose';

export interface IPopularPosts extends Document {
  category: string;
  topic: string;
  content: string;
  hook: string;
  createdAt: Date;
  updatedAt: Date;
}

const PopularPostsSchema: Schema = new Schema({
  category: { type: String, required: true },
  topic: { type: String, required: true },
  content: { type: String, required: true },
  hook: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPopularPosts>('PopularPosts', PopularPostsSchema);
