import mongoose, { Schema, Document } from 'mongoose';

export interface IItemUser extends Document {
  userId: string;
  key: string;
}

const ItemUserSchema: Schema = new Schema({
  userId: { type: String, required: true },
  key: { type: String, required: true },
});

export default mongoose.model<IItemUser>('ItemUser', ItemUserSchema);
