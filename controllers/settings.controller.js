const SiteSettings = require('../models/SiteSettings.model');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// @desc    Public website content (impact stats and programs)
// @route   GET /api/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    const doc = await SiteSettings.findOne({ key: 'main' }).lean();
    res.json({
      success: true,
      data: {
        // null tells the website to use its built-in defaults
        stats: doc && doc.stats && doc.stats.length ? doc.stats : null,
        programs: doc && doc.programs && doc.programs.length ? doc.programs : null,
      },
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    res.status(500).json({ success: false, message: 'Failed to load site content' });
  }
};

// @desc    Update impact stats and programs
// @route   PUT /api/admin/settings
// @access  Private (Admin, Superadmin)
exports.updateSettings = async (req, res) => {
  try {
    const { stats, programs } = req.body;

    if (!Array.isArray(stats) || !Array.isArray(programs)) {
      return res.status(400).json({ success: false, message: 'Stats and programs must be lists' });
    }
    if (stats.length > 6 || programs.length > 8) {
      return res.status(400).json({ success: false, message: 'Too many items. Use up to 6 stats and 8 programs.' });
    }

    const cleanStats = stats
      .map((s) => ({ value: str(s?.value, 20), label: str(s?.label, 80), note: str(s?.note, 160) }))
      .filter((s) => s.value || s.label);
    if (cleanStats.some((s) => !s.value || !s.label)) {
      return res.status(400).json({ success: false, message: 'Every stat needs a number and a label' });
    }

    const cleanPrograms = programs
      .map((p) => ({
        title: str(p?.title, 120),
        short: str(p?.short, 300),
        timeline: str(p?.timeline, 60),
        description: str(p?.description, 1200),
        impact: str(p?.impact, 300),
        activities: (Array.isArray(p?.activities) ? p.activities : [])
          .map((a) => str(a, 160))
          .filter(Boolean)
          .slice(0, 8),
      }))
      .filter((p) => p.title || p.short);
    if (cleanPrograms.some((p) => !p.title || !p.short)) {
      return res.status(400).json({ success: false, message: 'Every program needs a title and a short summary' });
    }

    const doc = await SiteSettings.findOneAndUpdate(
      { key: 'main' },
      { stats: cleanStats, programs: cleanPrograms, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, data: { stats: doc.stats, programs: doc.programs } });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, message: 'Failed to save site content' });
  }
};
