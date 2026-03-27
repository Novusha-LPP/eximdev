/**
 * User model shim for the attendance module.
 * All attendance-specific fields are now merged into EXIM's userModel.mjs.
 * We simply retrieve the already-registered Mongoose model by name.
 */
const mongoose = require('mongoose');
module.exports = mongoose.model('User');
