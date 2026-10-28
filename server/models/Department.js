const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a department name'],
        trim: true,
        maxlength: [120, 'Department name cannot exceed 120 characters']
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        required: [true, 'Please select a faculty']
    }
}, {
    timestamps: true
});

// A department name only needs to be unique inside its faculty
departmentSchema.index({ name: 1, faculty: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
