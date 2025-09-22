import mongoose, { Schema, Document } from 'mongoose';

export interface IExisingPlugData extends Document {
  integrationId: string;
  methodName: string;
  value: string;
}

const ExisingPlugDataSchema: Schema = new Schema({
  integrationId: { type: String, required: true },
  methodName: { type: String, required: true },
  value: { type: String, required: true },
});

export default mongoose.model<IExisingPlugData>('ExisingPlugData', ExisingPlugDataSchema);
