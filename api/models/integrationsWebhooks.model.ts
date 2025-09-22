import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegrationsWebhooks extends Document {
  integrationId: string;
  webhookId: string;
}

const IntegrationsWebhooksSchema: Schema = new Schema({
  integrationId: { type: String, required: true },
  webhookId: { type: String, required: true },
});

export default mongoose.model<IIntegrationsWebhooks>('IntegrationsWebhooks', IntegrationsWebhooksSchema);
