import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default:
        "https://res.cloudinary.com/dtml0aorx/image/upload/v1761055139/avatar_edgdft.png",
    },
    contacts: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        displayName: { type: String }, // custom name for this contact
        isSaved : {type : Boolean},
      },
    ],
    recentChats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
