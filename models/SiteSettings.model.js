const mongoose = require('mongoose');

/**
 * Editable website content, stored as a single document. Anything left empty here falls back to the
 * defaults built into the website, so the site always has something sensible to show.
 */
const statSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true, maxlength: 20 },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    note: { type: String, trim: true, maxlength: 160, default: '' },
  },
  { _id: false }
);

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    short: { type: String, required: true, trim: true, maxlength: 300 },
    timeline: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 1200, default: '' },
    impact: { type: String, trim: true, maxlength: 300, default: '' },
    activities: [{ type: String, trim: true, maxlength: 160 }],
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    stats: [statSchema],
    programs: [programSchema],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
