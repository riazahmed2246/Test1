import mongoose, { Schema, Document } from 'mongoose';

export interface IMentions extends Document {
  name: string;
  username: string;
  platform: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

const MentionsSchema: Schema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  platform: { type: String, required: true },
  image: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMentions>('Mentions', MentionsSchema);
