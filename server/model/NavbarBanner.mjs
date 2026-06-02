import mongoose from "mongoose";

const navbarBannerSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  link: {
    type: String,
    trim: true,
  },
  textColor: {
    type: String,
    default: "#ffffff",
    trim: true,
  },
  backgroundColor: {
    type: String,
    default: "linear-gradient(90deg, #1a237e 0%, #311b92 100%)",
    trim: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  animationType: {
    type: String,
    enum: ["none", "marquee", "pulse", "slide-in"],
    default: "none",
  },
  height: {
    type: Number,
    default: 36,
  },
  closable: {
    type: Boolean,
    default: true,
  },
  customCss: {
    type: String,
    trim: true,
  },
  displayMode: {
    type: String,
    enum: ["top-bar", "appbar-overlay"],
    default: "top-bar",
  },
  opacity: {
    type: Number,
    default: 1.0,
  },
  updatedBy: {
    type: String,
    required: true,
  },
}, {
  timestamps: true
});

const NavbarBanner = mongoose.model("NavbarBanner", navbarBannerSchema);
export default NavbarBanner;
