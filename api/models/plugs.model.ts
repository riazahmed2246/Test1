import mongoose, { Schema, Document } from 'mongoose';

export interface IPlugs extends Document {
  organizationId: string;
  plugFunction: string;
  data: string;
  integrationId: string;
  activated: boolean;
}

const PlugsSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  plugFunction: { type: String, required: true },
  data: { type: String, required: true },
  integrationId: { type: String, required: true },
  activated: { type: Boolean, default: true },
});

export default mongoose.model<IPlugs>('Plugs', PlugsSchema);
