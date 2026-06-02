import mongoose from "mongoose";

const ExtraContentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["link", "badge", "text"],
      default: "link",
    },
    label: { type: String, default: "" },
    icon: { type: String, default: "" },
    href: { type: String, default: "" },
    badgeColor: { type: String, default: "#1a237e" },
  },
  { _id: true }
);

const AppBarSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    backgroundColor: { type: String, default: "rgba(249, 250, 251, 0.3)" },
    backgroundOpacity: { type: Number, default: 0.3, min: 0, max: 1 },
    blurIntensity: { type: Number, default: 6, min: 0, max: 30 },
    textColor: { type: String, default: "#000000" },
    shadow: { type: String, default: "none" },
    height: { type: Number, default: 64, min: 48, max: 120 },
    borderBottom: { type: String, default: "none" },
    extraContent: { type: [ExtraContentSchema], default: [] },
  },
  { _id: false }
);

const SidebarSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    backgroundColor: { type: String, default: "#111b21" },
    iconColor: { type: String, default: "#ffffff9f" },
    activeItemColor: { type: String, default: "#ffffff" },
    hoverColor: { type: String, default: "#ffffff" },
    hoverBgColor: { type: String, default: "rgba(255,255,255,0.08)" },
    width: { type: Number, default: 60, min: 48, max: 260 },
    mode: { type: String, enum: ["icon-only", "icon-label"], default: "icon-only" },
    backgroundImage: { type: String, default: "sidebar-bg.webp" },
    glassEffect: { type: Boolean, default: false },
    borderRight: { type: String, default: "none" },
    itemSpacing: { type: Number, default: 0, min: 0, max: 16 },
  },
  { _id: false }
);

const BannerSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: "" },
    link: { type: String, default: "" },
    textColor: { type: String, default: "#ffffff" },
    backgroundColor: { type: String, default: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)" },
    height: { type: Number, default: 36, min: 24, max: 60 },
    animationType: { type: String, enum: ["none", "marquee", "pulse"], default: "none" },
    displayMode: { type: String, enum: ["top-bar", "appbar-overlay"], default: "top-bar" },
    opacity: { type: Number, default: 1.0, min: 0, max: 1 },
    closable: { type: Boolean, default: true },
    customCss: { type: String, default: "" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: false }
);

const UILayoutConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: "Default" },
    isActive: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    appbar: { type: AppBarSchema, default: () => ({}) },
    sidebar: { type: SidebarSchema, default: () => ({}) },
    banner: { type: BannerSchema, default: () => ({}) },
    customCss: { type: String, default: "" },
  },
  { timestamps: true }
);

// Ensure only one active config at a time
UILayoutConfigSchema.pre("save", async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isActive: false } }
    );
  }
  next();
});

UILayoutConfigSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update?.$set?.isActive || update?.isActive) {
    const docId = this.getQuery()._id;
    const model = this.model;
    const query = docId ? { _id: { $ne: docId } } : {};
    await model.updateMany(query, { $set: { isActive: false } });
  }
  next();
});

const UILayoutConfigModel = mongoose.model("UILayoutConfig", UILayoutConfigSchema);

export default UILayoutConfigModel;
