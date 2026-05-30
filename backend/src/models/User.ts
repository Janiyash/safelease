import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'tenant' | 'owner' | 'admin';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  refreshToken?: string;
  assignedProperty?: mongoose.Types.ObjectId;
  ownedProperties: mongoose.Types.ObjectId[];
  notifications: INotification[];
  twoFactorEnabled: boolean;
  otpCode?: string;
  otpExpires?: Date;
  otpAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface INotification {
  _id: mongoose.Types.ObjectId;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  link?: string;
  category?: 'rent' | 'payment' | 'complaint' | 'notice' | 'maintenance' | 'system';
  relatedId?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  message:   { type: String, required: true },
  type:      { type: String, enum: ['info','warning','success','error'], default: 'info' },
  read:      { type: Boolean, default: false },
  link:      String,
  category:  { type: String, enum: ['rent','payment','complaint','notice','maintenance','system'] },
  relatedId: String,
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema<IUser>({
  name:     { type: String, required: true, trim: true, maxlength: 100 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role:     { type: String, enum: ['tenant','owner','admin'], required: true, default: 'tenant' },
  phone:    { type: String, trim: true },
  avatar:   String,
  isActive:               { type: Boolean, default: true },
  isEmailVerified:        { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  passwordResetToken:     { type: String, select: false },
  passwordResetExpires:   { type: Date,   select: false },
  refreshToken:           { type: String, select: false },
  assignedProperty:  { type: Schema.Types.ObjectId, ref: 'Property' },
  ownedProperties:   [{ type: Schema.Types.ObjectId, ref: 'Property' }],
  notifications:     [NotificationSchema],
  twoFactorEnabled:  { type: Boolean, default: false },
  otpCode:           { type: String, select: false },
  otpExpires:        { type: Date,   select: false },
  otpAttempts:       { type: Number, default: 0, select: false },
}, { timestamps: true });

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as any).password;
    delete (ret as any).refreshToken;
    delete (ret as any).emailVerificationToken;
    delete (ret as any).passwordResetToken;
    delete (ret as any).passwordResetExpires;
    delete (ret as any).otpCode;
    delete (ret as any).otpExpires;
    delete (ret as any).otpAttempts;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
