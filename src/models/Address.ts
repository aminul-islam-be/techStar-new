import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  division: string;
  country: string;
  isDefault: boolean;
}

const AddressSchema = new Schema<IAddress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  area: { type: String, default: '' },
  city: { type: String, required: true },
  division: { type: String, required: true },
  country: { type: String, default: 'Bangladesh' },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export default (mongoose.models.Address as mongoose.Model<IAddress>) ||
  mongoose.model<IAddress>('Address', AddressSchema);
