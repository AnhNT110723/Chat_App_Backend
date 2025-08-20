const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // UUID
    name: { type: String, required: true },
    members: [{ type: String }], // Array usernames
    creator: { type: String },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Group', groupSchema);