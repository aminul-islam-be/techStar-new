import mongoose, { Model, Schema } from "mongoose";

export interface IUser {
  fullName: string;
  phone: string;
  password: string;
  email?: string;
  permanentAddress?: string;
  profilePicture?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "others";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  maritalStatus?: "married" | "unmarried" | "single";
  country?: string;
  division?: string;
  area?: string;
  city?: string;
  office?: string;
  study?: string;
  role: "customer" | "admin";
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },
    dateOfBirth: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["male", "female", "others"],
      default: undefined,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      default: undefined,
    },
    maritalStatus: {
      type: String,
      enum: ["married", "unmarried", "single"],
      default: undefined,
    },
    country: {
      type: String,
      trim: true,
      default: "Bangladesh",
    },
    division: {
      type: String,
      trim: true,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
      trim: true,
    },
    permanentAddress: {
      type: String,
      trim: true,
      default: "",
    },
    area: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    office: {
      type: String,
      trim: true,
      default: "",
    },
    study: {
      type: String,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
