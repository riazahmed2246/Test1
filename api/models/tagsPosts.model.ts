import mongoose, { Schema, Document } from 'mongoose';

export interface ITagsPosts extends Document {
  postId: string;
  tagId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TagsPostsSchema: Schema = new Schema({
  postId: { type: String, required: true },
  tagId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITagsPosts>('TagsPosts', TagsPostsSchema);
